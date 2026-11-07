import vine, { SimpleMessagesProvider } from '@vinejs/vine'

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

/** Owner sets a role on the users page. Ownership moves only by transfer. */
export const roleValidator = vine.create({
  role: vine.enum(['admin', 'member'] as const),
})
roleValidator.messagesProvider = new SimpleMessagesProvider({
  'role.enum': 'Choose Admin or Member',
  'role.required': 'Choose Admin or Member',
})
