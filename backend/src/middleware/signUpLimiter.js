import { rateLimit } from "express-rate-limit";

const signUpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: {
    message: "Too many signup attempts. Please try again later.",
  },
});

export default signUpLimiter;