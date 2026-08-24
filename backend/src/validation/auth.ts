import Joi from "joi";

export const registerSchema = Joi.object({
  full_name: Joi.string().min(3).required(),  
  username: Joi.string().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

export const loginSchema = Joi.object({
  identifier: Joi.string()
    .min(3)
    .required()
    .messages({
      "string.empty": "Email or username is required",
    }),
  password: Joi.string().min(6).required(),
});
