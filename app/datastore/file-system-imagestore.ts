import {Imagestore} from './imagestore';

import * as fs from 'fs';

export class FileSystemImagestore extends Imagestore {

    constructor(private basePath: string, loadSampleData: boolean) {
        super();
        if (this.basePath.substr(-1) != '/') this.basePath += '/';
        if (!fs.existsSync(this.basePath)) fs.mkdirSync(this.basePath);
        if (loadSampleData) this.loadSampleData();
    }

    /**
     * @param key the identifier for the data
     * @param data the binary data to be stored
     * @returns {Promise<any>} resolve -> (),
     *   reject -> the error message
     */
    public create(key: string, data: ArrayBuffer): Promise<any> {

        return new Promise((resolve, reject) => {

            fs.writeFile(this.basePath + key, Buffer.from(data), {flag: 'wx'}, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    /**
     * @param key the identifier for the data
     * @returns {Promise<any>} resolve -> (data), the data read with the key,
     *  reject -> the error message
     */
    public read(key: string): Promise<ArrayBuffer> {

        return new Promise((resolve, reject) => {
            fs.readFile(this.basePath + key, (err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        });
    }

    /**
     * @param key the identifier for the data
     * @param data the binary data to be stored
     * @returns {Promise<any>} resolve -> (),
     *   reject -> the error message
     */
    public update(key: string, data: ArrayBuffer): Promise<any> {

        return new Promise((resolve, reject) => {
            fs.writeFile(this.basePath + key, Buffer.from(data), {flag: 'w'}, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    /**
     * @param key the identifier for the data to be removed
     * @returns {Promise<any>} resolve -> (),
     *   reject -> the error message
     */
    public remove(key: string): Promise<any> {

        return new Promise((resolve, reject) => {
            fs.unlink(this.basePath + key, (err) => {
                if (err) reject(err);
                else resolve();
            })
        });
    }

    private loadSampleData(): void {
        fs.readdir('imagestore', (err, files) => {
            files.forEach(file => {
                fs.createReadStream('imagestore/' + file).pipe(fs.createWriteStream(this.basePath + '/' + file));
            })
        });
        console.debug("Successfully put sample images to imagestore ("+this.basePath+")");
    }
}