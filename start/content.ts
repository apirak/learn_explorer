/**
 * Reads content v1 once at boot, so no request waits on the files or touches the database for content.
 */
import '#services/content_service'
