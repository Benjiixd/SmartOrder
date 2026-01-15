import jwt from 'jsonwebtoken';

export function verifyJWT(token: String): boolean {
    try{
        const result = jwt.verify(token as string, process.env.PUBLIC_KEY as string);
        console.log("JWT verified:", result);
        return true;
    }
    catch(err){
        console.log("JWT verification failed:", err);
        return false;
    }
}

export function decodeJWT(token: String): any {
    try{
        const decoded = jwt.decode(token as string);
        console.log("JWT decoded:", decoded);
        return decoded;
    }
    catch(err){
        console.log("JWT decoding failed:", err);
        return null;
    }
}