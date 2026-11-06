/**
 * Reads content v1 and the consent text once at boot, so no request waits on the files or
 * touches the database for content, and a missing consent file stops the app from starting.
 */
import '#services/content_service'
import '#services/consent_service'
