import {to} from 'tsfun';
import {createApp, setupSettingsService, setupSyncTestDb} from './subsystem-helper';
import {ImportFacade} from '../../app/core/import/import-facade';
import {Validator} from '../../app/core/model/validator';
import {TypeUtility} from '../../app/core/model/type-utility';
import {ValidationErrors} from '../../app/core/model/validation-errors';
import {ImportErrors} from '../../app/core/import/import-errors';
import {PouchdbManager} from '../../app/core/datastore/core/pouchdb-manager';

/**
 * @author Daniel de Oliveira
 */
describe('Import/Subsystem', () => {

    let datastore;
    let _projectConfiguration;

    beforeEach(async done => {

        await setupSyncTestDb();
        const {projectConfiguration} = await setupSettingsService(new PouchdbManager());
        _projectConfiguration = projectConfiguration;
        const {idaiFieldDocumentDatastore} = await createApp();
        datastore = idaiFieldDocumentDatastore;
        done();
    });


    it('create one operation', async done => {

       await ImportFacade.doImport(
            'native',
            new Validator(_projectConfiguration, datastore, new TypeUtility(_projectConfiguration)),
            datastore,
            { getUsername: () => 'testuser'},
            _projectConfiguration,
            undefined,
            undefined,
                '{ "type": "Trench", "identifier" : "t1", "shortDescription" : "Our Trench 1"}');

        const result = await datastore.find({});
        expect(result.documents.length).toBe(1);
        expect(result.documents[0].resource.identifier).toBe('t1');
        done();
    });


    it('produce validation error', async done => {

        const trench = await datastore.create({ resource: { identifier: 't1', type: 'Trench', shortDescription: 'Our Trench 1', relations: {}}});

        const report = await ImportFacade.doImport(
            'native',
            new Validator(_projectConfiguration, datastore, new TypeUtility(_projectConfiguration)),
            datastore,
            { getUsername: () => 'testuser'},
            _projectConfiguration,
            trench.resource.id,
            undefined,
                    '{ "type": "Find", "identifier" : "obob1", "shortDescription" : "O.B. One", "geometry": { "type": "UnsupportedGeometryType", "coordinates": [1, 2] } }');

        expect(report.errors[0]).toEqual([ValidationErrors.UNSUPPORTED_GEOMETRY_TYPE, "UnsupportedGeometryType"]);
        done();
    });


    it('create one find, connect to existing operation ', async done => {

        const stored = await datastore.create({ resource: { identifier: 't1', type: 'Trench', shortDescription: 'Our Trench 1', relations: {}}});

        await ImportFacade.doImport(
            'native',
            new Validator(_projectConfiguration, datastore, new TypeUtility(_projectConfiguration)),
            datastore,
            { getUsername: () => 'testuser'},
            _projectConfiguration,
            stored.resource.id,
            false,
                    '{ "type": "Find", "identifier" : "f1", "shortDescription" : "Our Find 1"}');

        const result = await datastore.find({});
        expect(result.documents.length).toBe(2);
        expect(result.documents.map(to('resource.identifier'))).toContain('t1');
        expect(result.documents.map(to('resource.identifier'))).toContain('f1');
        done();
    });


    it('invalid structure - dont import', async done => {

        const resourceId = (await datastore.create(
            { resource: { identifier: 't1', type: 'Trench', shortDescription: 'Our Trench 1', relations: {}}}
            )).resource.id;

        const importReport = await ImportFacade.doImport(
            'native',
            new Validator(_projectConfiguration, datastore, new TypeUtility(_projectConfiguration)),
            datastore,
            { getUsername: () => 'testuser'},
            _projectConfiguration,
            resourceId,
            false,
            '{ "type": "Feature", "identifier" : "f1", "shortDescription" : "feature1"}'+ "\n"
                    + '{ "type": "InvalidType", "identifier" : "f2", "shortDescription" : "feature2"}');

        expect(importReport.errors[0]).toEqual([ValidationErrors.INVALID_TYPE, 'InvalidType']);
        const result = await datastore.find({});
        expect(result.documents.length).toBe(1); // only the trench
        done();
    });


    it('update shortDescription', async done => {

        await datastore.create({ resource: { identifier: 'f1', type: 'Feature', shortDescription: 'feature1', relations: { isRecordedIn: ['a']}}});

        await ImportFacade.doImport(
            'native',
            new Validator(_projectConfiguration, datastore, new TypeUtility(_projectConfiguration)),
            datastore,
            { getUsername: () => 'testuser'},
            _projectConfiguration,
            undefined,
            true,
                    '{ "type": "Feature", "identifier" : "f1", "shortDescription" : "feature_1"}');

        const result = await datastore.find({});
        expect(result.documents[0].resource.shortDescription).toBe('feature_1');
        done();
    });


    it('unmatched items get ignored on merge', async done => {

        await datastore.create({ resource: { identifier: 'f1', type: 'Feature', shortDescription: 'feature1', relations: { isRecordedIn: ['a']}}});

        await ImportFacade.doImport(
            'native',
            new Validator(_projectConfiguration, datastore, new TypeUtility(_projectConfiguration)),
            datastore,
            { getUsername: () => 'testuser'},
            _projectConfiguration,
            undefined,
            true,
                    '{ "type": "Feature", "identifier" : "f1", "shortDescription" : "feature_1"}' + "\n"
                + '{ "type": "Feature", "identifier" : "f2", "shortDescription" : "feature_2"}');

        const result = await datastore.find({});
        expect(result.documents.length).toBe(1);
        expect(result.documents[0].resource.shortDescription).toBe('feature_1');
        done();
    });


    it('import trench not allowed, when import into operation is activated', async done => {

        await datastore.create({ resource: { identifier: 't1', type: 'Trench', shortDescription: 'Our trench 1', relations: {}}});

        const importReport = await ImportFacade.doImport(
            'native',
            new Validator(_projectConfiguration, datastore, new TypeUtility(_projectConfiguration)),
            datastore,
            { getUsername: () => 'testuser'},
            _projectConfiguration,
            'f1',
            false,
                    '{ "type": "Trench", "identifier" : "t2", "shortDescription" : "Our Trench 2"}');

        expect(importReport.errors[0][0]).toEqual(ImportErrors.OPERATIONS_NOT_ALLOWED);

        const result = await datastore.find({});
        expect(result.documents[0].resource.identifier).toBe('t1');
        done();
    });
});
