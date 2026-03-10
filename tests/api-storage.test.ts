import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock storage
const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockRemove = vi.fn();
const mockStorageFrom = vi.fn();

// Mock supabase with storage
vi.mock("../src/lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
    storage: {
      from: (...args: any[]) => mockStorageFrom(...args),
    },
  },
}));

import { uploadListingImage, deleteListingImages } from "../src/lib/api";

describe("Storage API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorageFrom.mockReturnValue({
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl,
      remove: mockRemove,
    });
  });

  describe("uploadListingImage", () => {
    it("uploads file and returns public URL", async () => {
      mockUpload.mockResolvedValue({ data: { path: "user1/123.jpg" }, error: null });
      mockGetPublicUrl.mockReturnValue({
        data: { publicUrl: "https://test.supabase.co/storage/v1/object/public/listing-images/user1/123.jpg" },
      });

      const file = new File(["test"], "photo.jpg", { type: "image/jpeg" });
      const url = await uploadListingImage(file, "user1");

      expect(mockStorageFrom).toHaveBeenCalledWith("listing-images");
      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringContaining("user1/"),
        file,
        expect.objectContaining({ contentType: "image/jpeg", upsert: false }),
      );
      expect(url).toContain("listing-images");
    });

    it("generates unique path with user ID prefix", async () => {
      mockUpload.mockResolvedValue({ data: { path: "abc/test.png" }, error: null });
      mockGetPublicUrl.mockReturnValue({ data: { publicUrl: "https://example.com/img.png" } });

      const file = new File(["x"], "image.png", { type: "image/png" });
      await uploadListingImage(file, "abc");

      const uploadPath = mockUpload.mock.calls[0][0];
      expect(uploadPath).toMatch(/^abc\//);
      expect(uploadPath).toMatch(/\.png$/);
    });

    it("throws on upload error", async () => {
      mockUpload.mockResolvedValue({ data: null, error: { message: "File too large" } });

      const file = new File(["x"], "big.jpg", { type: "image/jpeg" });
      await expect(uploadListingImage(file, "user1")).rejects.toEqual({ message: "File too large" });
    });

    it("preserves file extension", async () => {
      mockUpload.mockResolvedValue({ data: { path: "u/test.webp" }, error: null });
      mockGetPublicUrl.mockReturnValue({ data: { publicUrl: "https://example.com/test.webp" } });

      const file = new File(["x"], "photo.webp", { type: "image/webp" });
      await uploadListingImage(file, "u");

      const uploadPath = mockUpload.mock.calls[0][0];
      expect(uploadPath).toMatch(/\.webp$/);
    });
  });

  describe("deleteListingImages", () => {
    it("extracts paths from URLs and calls remove", async () => {
      mockRemove.mockResolvedValue({ error: null });

      await deleteListingImages([
        "https://test.supabase.co/storage/v1/object/public/listing-images/user1/img1.jpg",
        "https://test.supabase.co/storage/v1/object/public/listing-images/user1/img2.png",
      ]);

      expect(mockStorageFrom).toHaveBeenCalledWith("listing-images");
      expect(mockRemove).toHaveBeenCalledWith(["user1/img1.jpg", "user1/img2.png"]);
    });

    it("does nothing for empty array", async () => {
      await deleteListingImages([]);
      expect(mockRemove).not.toHaveBeenCalled();
    });

    it("skips URLs that don't match the bucket pattern", async () => {
      mockRemove.mockResolvedValue({ error: null });

      await deleteListingImages([
        "https://other.com/random/image.jpg",
        "https://test.supabase.co/storage/v1/object/public/listing-images/user1/valid.jpg",
      ]);

      expect(mockRemove).toHaveBeenCalledWith(["user1/valid.jpg"]);
    });

    it("does nothing when all URLs are invalid", async () => {
      await deleteListingImages([
        "https://other.com/image.jpg",
        "https://random.com/photo.png",
      ]);

      expect(mockRemove).not.toHaveBeenCalled();
    });

    it("throws on remove error", async () => {
      mockRemove.mockResolvedValue({ error: { message: "Permission denied" } });

      await expect(
        deleteListingImages([
          "https://test.supabase.co/storage/v1/object/public/listing-images/user1/img.jpg",
        ]),
      ).rejects.toEqual({ message: "Permission denied" });
    });
  });
});
