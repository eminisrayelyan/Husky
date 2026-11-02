import multer from "multer";

const upload = multer({
    storage: multer.memoryStorage(),

    limits: {
        fileSize: 2 * 1024 * 1024,
        files: 1,
        fields: 0,
    },

    fileFilter(req, file, callback) {
        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
        ];

        if (!allowedTypes.includes(file.mimetype)) {
            const error = new Error("Choose a JPG, PNG, or WebP image");
            error.status = 400;
            return callback(error);
        }

        callback(null, true);
    },
}).single("photo");

function uploadPhoto(req, res, next) {
    upload(req, res, (error) => {
        if (error) {
            if (error.code === "LIMIT_FILE_SIZE") {
                return res.status(413).json({
                    message: "Photo must be 2 MB or smaller",
                });
            }

            if (error instanceof multer.MulterError) {
                return res.status(400).json({
                    message: "Upload one file using the photo field",
                });
            }

            return next(error);
        }

        if (!req.file) {
            return res.status(400).json({
                message: "Please select a photo",
            });
        }

        next();
    });
}

export default uploadPhoto;