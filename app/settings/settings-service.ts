import {Injectable} from "@angular/core";
import {Observable} from "rxjs/Observable";
import {Observer} from "rxjs/Observer";
import {IdaiFieldDatastore} from "../datastore/idai-field-datastore";
import {Settings} from "./settings";
import {SettingsSerializer} from "./settings-serializer";


@Injectable()
/**
 * The settings service provides access to the
 * properties of the config.json file. It can be
 * serialized to and from config.json files.
 *
 * @author Daniel de Oliveira
 * @author Thomas Kleinke
 */
export class SettingsService {

    private observers: Observer<any>[] = [];

    private settings: Settings;
    private settingsSerializer: SettingsSerializer = new SettingsSerializer();

    public ready: Promise<any>;

    constructor(
        private datastore: IdaiFieldDatastore
    ) { }

    public init() {
        this.ready = this.settingsSerializer.load().then((settings)=>{
            this.settings = settings;

            console.log("settings",settings)

            if (this.settings.dbs && this.settings.dbs.length > 0) {
                this.datastore.select(this.settings.dbs[0]);
                this.selectProject(this.settings.dbs[0]);
                this.startSync();
            }
        })
    }

    public restartSync() {
        if (!this.settings.dbs || !(this.settings.dbs.length > 0)) return;

        this.datastore.select(this.settings.dbs[0]);
        return new Promise<any>((resolve) => {
            this.datastore.stopSync();
            setTimeout(() => {
                this.startSync().then(() => resolve());
            }, 1000);
        })
    }

    public setRemoteSites(remoteSites) {
        this.settings.remoteSites = remoteSites;
        this.notify();
    }

    public getRemoteSites() {
        return JSON.parse(JSON.stringify(this.settings.remoteSites));
    }

    public setServer(server) {
        this.settings.server = server;
        this.notify();
    }

    public getServer() {
        return JSON.parse(JSON.stringify(this.settings.server));
    }

    public setUserName(userName) {
        this.settings.userName = userName;
        this.notify();
    }

    public getUserName() {
        return this.settings.userName ? JSON.parse(JSON.stringify(this.settings.userName)) : 'anonymous';
    }

    public getProjects() {
        return this.settings.dbs;
    }

    public getSelectedProject() {
        if (!this.settings.dbs || this.settings.dbs.length == 0) {
            return undefined;
        } else {
            return this.settings.dbs[0];
        }
    }

    public selectProject(name) {
        const index = this.settings.dbs.indexOf(name);
        if (index != -1) {
            this.settings.dbs.splice(index, 1);
            this.settings.dbs.unshift(name);
        }
    }

    private notify() {
        for (let o of this.observers) {
            console.log(o.next({
                server: this.getServer()
            }))
        }
    }

    public changes(): Observable<Document> {
        return Observable.create( observer => {
            this.observers.push(observer);
        });
    }

    private startSync(): Promise<any> {

        const promises = [];
        for (let remoteSite of this.settings.remoteSites) {
            promises.push(this.datastore.setupSync(remoteSite['ipAddress']));
        }
        if (this.serverSettingsComplete()) {
            promises.push(this.datastore.setupSync(this.convert(this.settings.server)));

        }

        this.notify();
        return Promise.all(promises);
    }

    private convert(serverSetting) {
        let converted = serverSetting['ipAddress'];
        converted = converted.replace('http://','http://'+
            serverSetting['userName'] + ':' + serverSetting['password'] + '@');
        return converted;
    }

    public storeSettings(): Promise<any> {
        return this.settingsSerializer.store(this.settings);
    }

    private serverSettingsComplete(): boolean {

        return (this.settings.server['userName'] && this.settings.server['userName'].length > 0 &&
            this.settings.server['password'] && this.settings.server['password'].length > 0 &&
            this.settings.server['ipAddress'] && this.settings.server['ipAddress'].length > 0);
    }
}