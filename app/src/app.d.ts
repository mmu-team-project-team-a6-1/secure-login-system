import type { User } from "$lib/data/example-data";

declare global {
	namespace App {
		interface Locals {
			user: User | null;
			sessionId: string | null;
		}
	}

	interface BarcodeDetectorOptions {
		formats?: string[];
	}

	interface DetectedBarcode {
		rawValue: string;
		format: string;
		boundingBox: DOMRectReadOnly;
	}

	class BarcodeDetector {
		constructor(options?: BarcodeDetectorOptions);
		detect(source: ImageBitmapSource): Promise<DetectedBarcode[]>;
		static getSupportedFormats(): Promise<string[]>;
	}
}

export {};
