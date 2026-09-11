import { expect, test } from "@playwright/test";
import { adminClient, authenticate, complexId, openProtected, password } from "./auth";

test('anonymous visitor is redirected; UI login opens the real feed', async ({ page }) => {
  await page.goto('/requests');
  await expect(page).toHaveURL(/\/login/);
  await page.getByPlaceholder('your@email.com').fill('resident@korshi.test');
  await page.getByPlaceholder('Введите пароль').fill(password);
  await page.getByRole('button', { name: 'Войти по email', exact: true }).click();
  await expect(page).toHaveURL(/\/feed$/);
  await expect(page.locator('#main-content h1')).toBeVisible();
});

test('resident → dispatcher → notification → rating survives reload', async ({ page, context, browser }) => {
  const resident = await authenticate(context);
  const title = `Свет на лестнице ${crypto.randomUUID().slice(0,8)}`;
  await openProtected(page, '/requests');
  await page.getByRole('button',{name:/^(Создать|Новая заявка)$/}).click();
  const dialog = page.getByRole('dialog', { name: 'Что случилось?' });
  await dialog.getByLabel('Короткое название').fill(title);
  await dialog.getByLabel('Описание',{exact:true}).fill('Не работает свет на лестнице второго этажа.');
  await dialog.getByLabel('Где это?').fill('Дом 1, второй этаж');
  await dialog.getByRole('button',{name:'Отправить заявку'}).click();
  const card = page.getByRole('article').filter({hasText:title});
  await expect(card).toBeVisible();
  const { data: rows, error } = await resident.from('service_requests').select('id').eq('title',title);
  expect(error).toBeNull(); expect(rows).toHaveLength(1);
  const id=rows![0].id;
  const dispatcherContext = await browser.newContext({ baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL });
  try {
    await authenticate(dispatcherContext,'dispatcher');
    const dispatcher = await dispatcherContext.newPage();
    await openProtected(dispatcher,'/requests');
    const work = dispatcher.getByRole('article').filter({hasText:title});
    await expect(work).toBeVisible();
    await work.getByRole('button', { expanded: false }).click();
    await work.getByRole('button',{name:'Принять в работу'}).click();
    await expect(work.getByRole('button',{name:'Отметить выполненной'})).toBeVisible();
    await work.getByRole('button',{name:'Отметить выполненной'}).click();
    await expect.poll(async()=> (await resident.from('service_requests').select('status').eq('id',id).single()).data?.status).toBe('resolved');
    await page.goto('/notifications');
    await expect(page.getByText(title+': ожидает вашей оценки')).toBeVisible();
    await page.goto('/requests');
    await page.getByRole('tab',{name:'Все',exact:true}).click();
    await expect(card).toBeVisible();
    await card.getByRole('button', { expanded: false }).click();
    await card.getByRole('button',{name:'Поставить 5',exact:true}).click();
    await expect(card.getByText('Ваша оценка: 5 из 5')).toBeVisible();
    await page.reload();
    await page.getByRole('tab',{name:'Все',exact:true}).click();
    await expect(card).toBeVisible();
    await card.getByRole('button', { expanded: false }).click();
    await expect(card.getByText('Ваша оценка: 5 из 5')).toBeVisible();
    expect((await resident.from('service_requests').select('status,rating').eq('id',id).single()).data).toEqual({status:'closed',rating:5});
  } finally {
    await dispatcherContext.close();
    await adminClient().from('service_requests').delete().eq('id',id);
  }
});

test('owner casts one immutable vote through UI', async ({ page, context }) => {
  const owner=await authenticate(context,'owner');
  const admin=adminClient();
  const id=crypto.randomUUID(), title=`E2E двор ${id.slice(0,8)}`;
  const result=await admin.from('official_votes').insert({ id, complex_id:complexId, created_by:'eeeeeeee-eeee-4eee-8eee-000000000003', title, description:'Учебное голосование для проверки неизменяемости бюллетеня.',status:'active',starts_at:new Date(Date.now()-60_000).toISOString(),ends_at:new Date(Date.now()+86400_000).toISOString() });
  expect(result.error).toBeNull();
  try {
    await openProtected(page,'/votes');
    const card=page.getByRole('article').filter({hasText:title});
    await card.getByRole('button',{name:'За',exact:true}).click();
    await card.getByRole('button',{name:'Подтвердить неизменяемый голос'}).click();
    await expect(card.getByText('Ваш голос учтён: За')).toBeVisible();
    await page.reload();
    await expect(card.getByText('Ваш голос учтён: За')).toBeVisible();
    const again=await owner.rpc('cast_official_vote',{p_vote_id:id,p_choice:'no'});
    expect(again.error?.code).toBe('23505');
  } finally { await admin.from('official_votes').delete().eq('id',id); }
});

test('other complex cannot read private request via API or UI', async ({ page, context }) => {
  const admin=adminClient(),id=crypto.randomUUID(),title=`Приватное обращение ${id.slice(0,8)}`;
  const insert=await admin.from('service_requests').insert({id,created_by:'eeeeeeee-eeee-4eee-8eee-000000000001',complex_id:complexId,category:'repair',title,description:'Проверка изоляции данных между разными ЖК.',location:'Дом 1'});
  expect(insert.error).toBeNull();
  try {
    const outsider=await authenticate(context,'outsider');
    const response=await outsider.from('service_requests').select('id').eq('id',id);
    expect(response.error).toBeNull();expect(response.data).toEqual([]);
    await openProtected(page,'/requests');
    await expect(page.getByText(title)).toHaveCount(0);
  } finally {await admin.from('service_requests').delete().eq('id',id);}
});

test('AI request failure is retained in the audit journal', async ({ context }) => {
  const resident = await authenticate(context);
  const response = await context.request.post('/api/ai', { data: { task: 'request_triage', prompt: 'В подъезде не работает освещение на втором этаже.' } });
  expect(response.status()).toBe(503);
  const payload = await response.json() as { jobId: string };
  expect(payload.jobId).toMatch(/^[0-9a-f-]{36}$/);
  try {
    const job = await resident.from('ai_jobs').select('status,error_code,human_review_required').eq('id', payload.jobId).single();
    expect(job.error).toBeNull();
    expect(job.data).toEqual({ status: 'failed', error_code: 'provider_not_configured', human_review_required: false });
  } finally {
    await adminClient().from('ai_jobs').delete().eq('id', payload.jobId);
  }
});
