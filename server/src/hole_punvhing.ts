import * as fs from 'fs';

export function inquireSeeders() {
    
}


export function divideDocument(filename: string, owner: string): Array<Buffer> {
    const path = `${owner}/${filename}`;
    const CHUNK_SIZE = 512;

    const content = fs.readFileSync(path);

    const result: Array<Buffer> = chunkSubstr(content, CHUNK_SIZE);

    return result;
}


function chunkSubstr(buffer: Buffer, size: number): Array<Buffer> {
    const chunksNumber = Math.ceil(buffer.length / size);

    const chunks = new Array<Buffer>(chunksNumber);

    for (let index = 0, start = 0; index < chunksNumber; index++, start += size) {
        chunks[index] = buffer.slice(start, size)
    }

    return chunks
}
