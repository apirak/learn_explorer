import { SettingSchema } from '#database/schema'

/** The single settings row (`id` 1). Read and write it through `RetentionService`. */
export default class Setting extends SettingSchema {
  static selfAssignPrimaryKey = true
}
