
import {
  isValidImageType,
  isValidFileSize,
  generateImagePathname,
  validateImageFile,
  MAX_FILE_SIZE,
  ALLOWED_IMAGE_TYPES,
} from "@/lib/upload";

describe("upload utilities", () => {
  describe(isValidImageType, () => {
    it("should return true for valid image types", () => {
      const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

      validTypes.forEach((type) => {
        const file = new File([], "test.jpg", { type });
        expect(isValidImageType(file)).toBeTruthy();
      });
    });

    it("should return false for invalid image types", () => {
      const invalidTypes = ["text/plain", "application/pdf", "image/svg+xml", "video/mp4"];

      invalidTypes.forEach((type) => {
        const file = new File([], "test.txt", { type });
        expect(isValidImageType(file)).toBeFalsy();
      });
    });
  });

  describe(isValidFileSize, () => {
    it("should return true for files within size limit", () => {
      const file = new File([new ArrayBuffer(1024 * 1024)], "test.jpg", {
        type: "image/jpeg",
      }); // 1MB
      expect(isValidFileSize(file)).toBeTruthy();
    });

    it("should return false for files exceeding size limit", () => {
      const largeBuffer = new ArrayBuffer(MAX_FILE_SIZE + 1);
      const file = new File([largeBuffer], "test.jpg", { type: "image/jpeg" });
      expect(isValidFileSize(file)).toBeFalsy();
    });

    it("should return true for files at exact size limit", () => {
      const buffer = new ArrayBuffer(MAX_FILE_SIZE);
      const file = new File([buffer], "test.jpg", { type: "image/jpeg" });
      expect(isValidFileSize(file)).toBeTruthy();
    });
  });

  describe(generateImagePathname, () => {
    it("should generate pathname for cover images", () => {
      const pathname = generateImagePathname("cover", "test-image.jpg");
      expect(pathname).toMatch(/^posts\/covers\/\d+-test-image\.jpg$/);
    });

    it("should generate pathname for content images", () => {
      const pathname = generateImagePathname("content", "article-image.png");
      expect(pathname).toMatch(/^posts\/content\/\d+-article-image\.png$/);
    });

    it("should generate pathname for profile images", () => {
      const pathname = generateImagePathname("profile", "avatar.jpg");
      expect(pathname).toMatch(/^artists\/profiles\/\d+-avatar\.jpg$/);
    });

    it("should generate pathname for event images", () => {
      const pathname = generateImagePathname("event", "flyer.jpg");
      expect(pathname).toMatch(/^events\/images\/\d+-flyer\.jpg$/);
    });

    it("should sanitize special characters in filename", () => {
      const pathname = generateImagePathname("cover", "test image (1).jpg");
      expect(pathname).toMatch(/^posts\/covers\/\d+-test_image.*\.jpg$/);
      // Verify special characters are replaced
      expect(pathname).not.toContain(" ");
      expect(pathname).not.toContain("(");
      expect(pathname).not.toContain(")");
    });
  });

  describe(validateImageFile, () => {
    it("should return valid for valid image file", () => {
      const file = new File([new ArrayBuffer(1024)], "test.jpg", {
        type: "image/jpeg",
      });
      const result = validateImageFile(file);
      expect(result.valid).toBeTruthy();
      expect(result.error).toBeUndefined();
    });

    it("should return invalid for wrong file type", () => {
      const file = new File([new ArrayBuffer(1024)], "test.txt", {
        type: "text/plain",
      });
      const result = validateImageFile(file);
      expect(result.valid).toBeFalsy();
      expect(result.error).toContain("Invalid file type");
    });

    it("should return invalid for file exceeding size limit", () => {
      const largeBuffer = new ArrayBuffer(MAX_FILE_SIZE + 1);
      const file = new File([largeBuffer], "test.jpg", { type: "image/jpeg" });
      const result = validateImageFile(file);
      expect(result.valid).toBeFalsy();
      expect(result.error).toContain("File size exceeds");
    });

    it("should include allowed types in error message", () => {
      const file = new File([new ArrayBuffer(1024)], "test.txt", {
        type: "text/plain",
      });
      const result = validateImageFile(file);
      expect(result.error).toContain(ALLOWED_IMAGE_TYPES.join(", "));
    });
  });
});
