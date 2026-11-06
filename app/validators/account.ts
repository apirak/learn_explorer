import vine from '@vinejs/vine'

export const profileValidator = vine.create({
  fullName: vine.string().trim().maxLength(255).nullable(),
  affiliation: vine.string().trim().maxLength(120).nullable(),
})

/** Same length rules as signup. The current password is checked with `User.verifyCredentials`. */
export const passwordValidator = vine.create({
  currentPassword: vine.string(),
  password: vine.string().minLength(8).maxLength(32),
  passwordConfirmation: vine.string().sameAs('password'),
})
