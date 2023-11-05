namespace sap.logm.srv;

using sap.logm.db as db from '../db/data-model';

service DevService {

    function parseChunkSim(chunk : String, fileName : String, logType : String) returns String;

}
