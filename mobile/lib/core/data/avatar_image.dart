import 'dart:typed_data';
import 'dart:ui' as ui;

/// Квадратный PNG 256×256 из любой фотографии: аватар весит килобайты.
Future<Uint8List> squareAvatarPng(Uint8List bytes, {int size = 256}) async {
  final codec = await ui.instantiateImageCodec(bytes);
  final frame = await codec.getNextFrame();
  final image = frame.image;
  final side = image.width < image.height ? image.width : image.height;
  final source = ui.Rect.fromLTWH((image.width - side) / 2,
      (image.height - side) / 2, side.toDouble(), side.toDouble());
  final recorder = ui.PictureRecorder();
  ui.Canvas(recorder).drawImageRect(image, source,
      ui.Rect.fromLTWH(0, 0, size.toDouble(), size.toDouble()), ui.Paint());
  final avatar = await recorder.endRecording().toImage(size, size);
  final data = await avatar.toByteData(format: ui.ImageByteFormat.png);
  image.dispose();
  avatar.dispose();
  return data!.buffer.asUint8List();
}
