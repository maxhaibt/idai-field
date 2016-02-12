import {describe,expect,it,xit, inject, beforeEachProviders} from 'angular2/testing';
import {ObjectEditComponent} from '../app/components/object-edit.component'
import {Datastore} from '../app/services/datastore'
import {IndexeddbDatastore} from '../app/services/indexeddb-datastore'
import {provide} from "angular2/core";
import {IdaiFieldObject} from "../app/model/idai-field-object";
import {Observable} from "rxjs/Observable";
import {Message} from "../app/services/message";

class MockTestDatastore {

    private testObject : IdaiFieldObject;

    public getTestObject() : IdaiFieldObject {
        return this.testObject;
    }

    create(object:IdaiFieldObject) : Promise<string> {
        this.testObject = object;
        return new Promise<string>((resolve, reject) => {
            resolve("ok");
        });
    }
}

class MockMessageService {
    deleteMessage() {}
}

/**
 * @author Daniel M. de Oliveira
 */
export function main() {
    describe('ObjectEditComponent', () => {

        beforeEachProviders(() => [
            ObjectEditComponent,
            provide(Datastore, {useClass: MockTestDatastore}),
            provide(Message, {useClass: MockMessageService})

        ]);

        it('should create a non existing object on changing object', inject([ObjectEditComponent, Datastore],
            (objectEditComponent: ObjectEditComponent, mockDatastore: Datastore) => {

            objectEditComponent.selectedObject =
                    {
                        "identifier": "ob1", "title": "Obi One Kenobi", "synced": 0,
                        "previousValue" :
                            { "identifier": "ob2", "title": "Boba Fett", "synced": 0 }
                    };

            objectEditComponent.onKey({});
            objectEditComponent.ngOnChanges({
                    selectedObject: objectEditComponent.selectedObject
            });

            expect((<MockTestDatastore> mockDatastore).getTestObject().identifier).toBe("ob2");
        }));
    });
}