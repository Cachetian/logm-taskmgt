namespace sap.logm.srv;

using sap.logm.db as db from '../db/data-model';

/**
 * Development service
 */
service DevService {

    /**
     * Simulate parse chunk API
     */
    action parseChunkSim(chunk : String, fileName : String, logType : String) returns String;

}
