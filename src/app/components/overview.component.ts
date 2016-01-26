import {Component, OnInit, Inject} from 'angular2/core';
import {Datastore} from '../services/datastore';
import {IdaiFieldObject} from '../model/idai-field-object';
import {provide} from "angular2/core";
import {IdaiFieldBackend} from '../services/idai-field-backend';
import {ModelUtils} from '../model/model-utils';
import {IdaiObserver} from "../idai-observer";
import {ObjectEditComponent} from "./object-edit.component";

@Component({
    templateUrl: 'templates/overview.html',
    directives: [ObjectEditComponent]
})

/**
 * @author Sebastian Cuy
 * @author Daniel M. de Oliveira
 * @author Jan G. Wieners
 * @author Thomas Kleinke
 */
export class OverviewComponent implements OnInit, IdaiObserver {

    notify():any {
        this.fetchObjects();
    }

    public selectedObject: IdaiFieldObject;
    public objects: IdaiFieldObject[];

    constructor(
        private datastore: Datastore,
        private idaiFieldBackend: IdaiFieldBackend,
        @Inject('app.config') private config) {

        datastore.subscribe(this);
    }

    onSelect(object: IdaiFieldObject) {
        this.selectedObject= ModelUtils.clone(object);
    }

    getObjectIndex( id: String ) {
        for (var i in this.objects) {
            if (this.objects[i].id==id) return i;
        }
        return null;
    }

    sync() {

        if (this.objects) {
            for (var o of this.objects) {

                if (!o.synced) {
                    this.idaiFieldBackend.save(o)
                        .then(
                            object => {

                                object.synced = true;
                                this.datastore.update(object);
                            },
                            err => {
                            }
                        );
                }
            }
        }
    }

    onKey(event:any) {
        if (event.target.value == "") {
            this.datastore.all({}).then(objects => {
                this.objects = objects;
            }).catch(err => console.error(err));
        } else {
            this.datastore.find(event.target.value, {}).then(objects => {
                this.objects = objects;
            }).catch(err => console.error(err));
        }
    }

    ngOnInit() {
        this.fetchObjects();
        setTimeout(this.checkForSync.bind(this), this.config.syncCheckInterval);
    }

    private fetchObjects() {
        this.datastore.all({}).then(objects => {
            this.objects = objects;
        }).catch(err => console.error(err));
    }

    checkForSync(): void {

        if (this.idaiFieldBackend.isConnected())
            this.sync();

        setTimeout(this.checkForSync.bind(this), this.config.syncCheckInterval);
    }
}
