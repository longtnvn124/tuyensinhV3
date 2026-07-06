export interface IctuTokenFile {
    id: number;
    name: string;
    title: string;
    ext: string;
    size: number;
    location: string;
    mineType: string;
}

export function str2IctuTokenFile(content: string): IctuTokenFile {
    try { return JSON.parse(content) as IctuTokenFile; }
    catch { return null; }
}

export function ictuTokenFile2Link(tokenFile: IctuTokenFile): string {
    return '/api/file/' + tokenFile.id;
}

export function matchIctuFileString(content: string): boolean {
    try {
        const parsed = JSON.parse(content);
        return parsed && typeof parsed.id === 'number';
    } catch { return false; }
}

