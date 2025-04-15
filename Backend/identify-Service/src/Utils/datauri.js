import DataURIparser from 'datauri/parser.js';
import logger from '../Utils/logger.js';
import path from 'path';

const getdatauri = (file) => {
    if(!file || !file.originalname || !file.buffer){
        logger.warn(`invalid file ${file.originalname}`);
    }
    const parser = new DataURIparser();
    const ext = path.extname(file.originalname).toString();
    return parser.format(ext, file.buffer);
}

export default getdatauri;