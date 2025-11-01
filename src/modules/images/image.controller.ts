import { Request, Response } from "express";
import imagekit from "../../config/imagekit.config";

export const uploadImage = async (req: Request, res: Response) => {
  try {
    const file = req.file;
    const folder = req.params.folder;

    if (!file || !file.buffer || !file.originalname) {
      return res.status(400).json({ message: "El archivo es necesario." });
    }

    const base64File = file.buffer.toString("base64");

    const result = await imagekit.upload({
      file: base64File,
      fileName: file.originalname,
      folder: `/${folder}`,
    });

    res.status(200).json({
      success: true,
      message: "Imagen subida correctamente.",
      imageUrl: result.url,
      fileId: result.fileId,
    });
  } catch (error: any) {
    console.error("Error al subir la imagen:", error);
    res.status(500).json({
      success: false,
      message: "Error al subir la imagen.",
      error: error?.message || error,
    });
  }
};
