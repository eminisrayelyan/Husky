import { uploadProfilePhoto } from "../services/photo.service.js";

async function uploadProfilePhotoController(req, res, next) {
    try {
        const photo = await uploadProfilePhoto(
            req.session.userId,
            req.file
        );

        return res.status(200).json({
            message: "Profile photo updated successfully",
            photo_url: photo.photo_url,
        });
    } catch (error) {
        next(error);
    }
}

export { uploadProfilePhotoController };