import Net from 'net';

export class p2pClient {

    private server: Net.Server | undefined;
    private document: Map<number, Buffer> | string;

    public getLoadedDocument(): Map<number, Buffer> | string {
        return this.document;
    }

    public constructor(filename: string, owner: string, username: string) {
        const xhr = new XMLHttpRequest();

        const url = `${username}/files/${owner}/${filename}`;

        this.document = "";

        xhr.onreadystatechange = () => {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    this.document = xhr.responseText;
                }
                else if (xhr.status === 150) {
                    const data = JSON.parse(xhr.responseText);
                    const max_ID: number = data.max_ID;
                    this.document = new Map<number, Buffer>();
                    this.welcomeUsers(max_ID);
                }
                else {
                    console.error(xhr.responseText);
                }
            }
        }

        xhr.open('GET', url);

    }

    // get the iP address from server (sync mechanism)
    public static connect(ip: string, id: number, chunk: string) {
        const PORT = 7055;

        const client = new Net.Socket();

        client.connect({ port: PORT, host: ip }, async () => {
            // If there is no error, the server has accepted the request and created a new 
            // socket dedicated to us.
            console.log('TCP connection established with the server.');
            let answer: Buffer | null;
            client.write("?");
            answer = client.read(1);
            if (answer === null|| answer.toString() !== "!") {
                console.error("Unable to connect to the new user.");
            }

            // The client can now send data to the server by writing to its socket.
            const data = {id: id, chunk: chunk};
            client.write(JSON.stringify(data));
            
            
        });
    }


    public welcomeUsers(last_ID: number) {
        const PORT = 7055;
        const CHUNK_SIZE = 512;

        this.server = Net.createServer(socket => {

            socket.write("?");

            socket.on("data", (data) => {

                if (data.toString() === "!") {
                    return;
                }

                const json = JSON.parse(data.toString());

                const id: number = json.id;

                const chunk: Buffer = json.chunk;

                if (chunk.length > CHUNK_SIZE) {
                    console.error(`Invalid chunk size: ${chunk.length}`);
                }
                // @ts-ignore
                if (this.document.has(id)) {
                    console.warn("Multiple sending of the same id occurred.\nthe data might be corrupted");
                    return;
                }
                
                // @ts-ignore
                this.document.set(id, chunk);

                if (this.isLoadingFinished(last_ID)) {
                    // @ts-ignore
                    this.server.close(error => {
                        console.error(error?.message);
                    });
                }
            });
            
        });

        this.server.listen(PORT);

    }

    private isLoadingFinished(last_ID: number): boolean {
        // @ts-ignore
        return (typeof document !== "string") && this.document.size === last_ID;
    }
}
