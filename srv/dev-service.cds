namespace sap.logm.srv;

using sap.logm.db as db from '../db/data-model';

service DevService {

    action parseChunkSim(chunk : String, fileName : String, logType : String) returns String;

}
