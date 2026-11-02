import { getProfile, updateProfile, getUsers } from "../services/user.service.js";


async function getProfileController(req, res, next) {
    try {
        const user = await getProfile(req.session.userId);

        return res.status(200).json({ user });
    } catch (error) {
        next(error);
    }
}

async function updateProfileController(req, res, next) {
    try {
        const user = await updateProfile(
            req.session.userId,
            res.locals.profileData
        );

        return res.status(200).json({
            message: "Profile updated successfully",
            user,
        });
    } catch (error) {
        next(error);
    }
}

async function getUsersController(req, res, next) {
    try {
        const users = await getUsers(req.session.userId);

        return res.status(200).json({ users });
    } catch (error) {
        next(error);
    }
}

export { getProfileController, updateProfileController, getUsersController };