import multer from 'multer'

const storage = multer.memoryStorage();

const profilephotoUpload = multer({storage}).single('profilephoto');

const ResumeUpload = multer({storage}).single('resume');

export { profilephotoUpload, ResumeUpload };