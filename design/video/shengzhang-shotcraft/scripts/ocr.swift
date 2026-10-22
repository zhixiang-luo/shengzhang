import AppKit
import Foundation
import Vision

guard CommandLine.arguments.count > 1 else {
  fputs("usage: swift scripts/ocr.swift <image> [image...]\n", stderr)
  exit(2)
}

for path in CommandLine.arguments.dropFirst() {
  guard
    let image = NSImage(contentsOfFile: path),
    let data = image.tiffRepresentation,
    let bitmap = NSBitmapImageRep(data: data),
    let cgImage = bitmap.cgImage
  else {
    fputs("failed to load \(path)\n", stderr)
    exit(1)
  }

  let request = VNRecognizeTextRequest()
  request.recognitionLevel = .accurate
  request.recognitionLanguages = ["zh-Hans", "en-US"]
  request.usesLanguageCorrection = true

  let handler = VNImageRequestHandler(cgImage: cgImage)
  try handler.perform([request])
  print("=== \(path) ===")
  for observation in request.results ?? [] {
    guard let candidate = observation.topCandidates(1).first else { continue }
    let box = observation.boundingBox
    print(
      String(
        format: "%.3f %.3f %.3f %.3f | %@",
        box.origin.x,
        box.origin.y,
        box.size.width,
        box.size.height,
        candidate.string
      )
    )
  }
}
