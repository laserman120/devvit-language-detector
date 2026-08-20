const AppUserId = 't2_2kx9kmth23';

export function isAuthorBlacklisted(author: string): boolean 
{
    if(author === AppUserId) {
        return true; 
    }

    return false
}