import { doc, FieldDocument, ImageDocument, Document } from 'idai-field-core';
import { flatten } from 'tsfun';
import { makeDocumentsLookup } from '../../../../../src/app/core/import/import/utils';
import { App, createApp, createHelpers, setupSyncTestDb } from '../subsystem-helper';

/**
 * @author Daniel de Oliveira
 */
describe('subsystem/relations-manager',() => {

    let app: App;
    let helpers;

    beforeEach(async done => {

        await setupSyncTestDb();
        app = await createApp();
        helpers = createHelpers(app);

        spyOn(console, 'error');
        // spyOn(console, 'warn');

        done();
    });


    async function createTestResourcesForRemoveTests() {

        const username = app.settingsProvider.getSettings().username;

        const d1 = doc('', 'identifierid1', 'Trench', 'id1') as FieldDocument;
        const d2 = doc('', 'identifierid2', 'Feature', 'id2') as FieldDocument;
        d2.resource.relations['isRecordedIn'] = ['id1'];
        const d3 = doc('', 'identifierid3', 'Find', 'id3') as FieldDocument;
        d3.resource.relations['isRecordedIn'] = ['id1'];
        d3.resource.relations['liesWithin'] = ['id2'];
        const d4 = doc('', 'identifierid4', 'Find', 'id4') as FieldDocument;
        d4.resource.relations['isRecordedIn'] = ['id1'];
        d4.resource.relations['liesWithin'] = ['id3'];
        d4.resource.relations['isDepictedIn'] = ['id5', 'id6'];

        const d5 = doc('', 'identifierid5', 'Image', 'id5');
        d5.resource.relations['depicts'] = ['id4'];
        const d6 = doc('', 'identifierid6', 'Image', 'id6');
        d6.resource.relations['depicts'] = ['id4', 'id7'];

        const d7 = doc('', 'identifierid7', 'Find', 'id7');
        d7.resource.relations['isDepictedIn'] = ['d6'];

        await app.datastore.create(d1, username);
        await app.datastore.create(d2, username);
        await app.datastore.create(d3, username);
        await app.datastore.create(d4, username);
        await app.datastore.create(d5, username);
        await app.datastore.create(d6, username);
        await app.datastore.create(d7, username);

        return [d1, d2, d3, d4, d5];
    }

    // TODO implement top level filtering
    // TODO impelment get multiple places
    // TODO implement, or review idsToSubtract
    it('get - place, trench, freature, find', async done => {

        const username = app.settingsProvider.getSettings().username;

        const p1 = doc('', 'identifieridp1', 'Place', 'idp1') as FieldDocument;
        const p2 = doc('', 'identifieridp2', 'Place', 'idp2') as FieldDocument;

        const d1 = doc('', 'identifierid1', 'Trench', 'id1') as FieldDocument;

        p2.resource.relations['liesWithin'] = ['idp1'];
        d1.resource.relations['liesWithin'] = ['idp2'];

        const d2 = doc('', 'identifierid2', 'Feature', 'id2') as FieldDocument;
        d2.resource.relations['isRecordedIn'] = ['id1'];
        const d3 = doc('', 'identifierid3', 'Find', 'id3') as FieldDocument;
        d3.resource.relations['isRecordedIn'] = ['id1'];
        d3.resource.relations['liesWithin'] = ['id2'];

        await app.datastore.create(p1, username);
        await app.datastore.create(p2, username);
        await app.datastore.create(d1, username);
        await app.datastore.create(d2, username);
        await app.datastore.create(d3, username);

        const results = makeDocumentsLookup(await app.relationsManager.get('idp1', { descendants: true }));
        expect(results['idp1'].resource.id).toBe('idp1');
        expect(results['idp2'].resource.id).toBe('idp2');
        expect(results['id1'].resource.id).toBe('id1');
        expect(results['id2'].resource.id).toBe('id2');
        expect(results['id3'].resource.id).toBe('id3');
        done();
    });


    it('get - only document', async done => {

        await helpers.createDocuments([
            ['tc1', 'TypeCatalog', ['t1']],
            ['t1', 'Type']
        ]);

        const result = await app.relationsManager.get('tc1');
        expect(result.resource.id).toBe('tc1');
        done();
    });


    it('get - include descendants', async done => {

        await helpers.createDocuments([
            ['tc1', 'TypeCatalog', ['t1']],
            ['t1', 'Type']
        ]);

        const results = await app.relationsManager.get('tc1', { descendants: true });
        const lookup = makeDocumentsLookup(results);
        expect(lookup['tc1'].resource.id).toBe('tc1');
        expect(lookup['t1'].resource.id).toBe('t1');
        done();
    });


    it('get - include antescendants', async done => {

        await helpers.createDocuments([
            ['tc1', 'TypeCatalog', ['t1']],
            ['t1', 'Type']
        ]);

        const results = await app.relationsManager.get('t1', { antecendants: true });
        const lookup = makeDocumentsLookup(results);
        expect(lookup['tc1'].resource.id).toBe('tc1');
        expect(lookup['t1'].resource.id).toBe('t1');
        done();
    });


    it('get - only descendants', async done => {

        await helpers.createDocuments([
            ['tc1', 'TypeCatalog', ['t1']],
            ['t1', 'Type']
        ]);

        const results = await app.relationsManager.get('tc1', { descendants: true, toplevel: false });
        expect(results.length).toBe(1);
        expect(results[0].resource.id).toBe('t1');
        done();
    });


    it('getDescendantsCount', async done => {

        const documentsLookup = await helpers.createDocuments([
            ['tc1', 'TypeCatalog', ['t1']],
            ['t1', 'Type'],
            ['tc2', 'TypeCatalog', ['t2']],
            ['t2', 'Type']
        ]);

        expect(await app.relationsManager.getDescendantsCount(documentsLookup['tc1'], documentsLookup['tc2'])).toBe(2);
        done();
    });


    it('remove, beginning with Feature', async done => {

        const [_, d2] = await createTestResourcesForRemoveTests();

        expect((await app.datastore.find({})).totalCount).toBe(7);
        await app.relationsManager.remove(d2, { descendants: true });

        await helpers.expectDocuments('id1', 'id5', 'id6', 'id7');
        done();
    });


    it('remove, beginning with Trench', async done => {

        const [d1, _] = await createTestResourcesForRemoveTests();

        expect((await app.datastore.find({})).totalCount).toBe(7);
        await app.relationsManager.remove(d1, { descendants: true });

        await helpers.expectDocuments('id5', 'id6', 'id7');
        done();
    });


    it('remove, beginning with Trench - keep a descendant', async done => {

        const [d1, _, d3] = await createTestResourcesForRemoveTests();

        expect((await app.datastore.find({})).totalCount).toBe(7);
        await app.relationsManager.remove(d1, { descendants: true, descendantsToKeep: [d3] });

        await helpers.expectDocuments('id3', 'id5', 'id6', 'id7');
        done();
    });


    it('skip image deletion', async done => {

        const tc1 = doc('', 'identifiertc1', 'TypeCatalog', 'tc1') as FieldDocument;
        const t1 = doc('', 'identifiert1', 'Type', 't1') as FieldDocument;
        const i1 = doc('', 'identifieri1', 'Image', 'i1') as ImageDocument;
        const i2 = doc('', 'identifieri2', 'Image', 'i2') as ImageDocument;
        i1.resource.relations = { depicts: ['tc1'] };
        i2.resource.relations = { depicts: ['t1'] };
        tc1.resource.relations = { isDepictedIn: ['i1'], isRecordedIn: [] };
        t1.resource.relations = { isDepictedIn: ['i2'], isRecordedIn: [], liesWithin: ['tc1'] };

        await app.datastore.create(tc1, 'test');
        await app.datastore.create(t1, 'test');
        await app.datastore.create(i1, 'test');
        await app.datastore.create(i2, 'test');

        expect((await app.datastore.find({})).documents.length).toBe(4);

        await app.relationsManager.remove(tc1, { descendants: true });

        const documents = (await app.datastore.find({})).documents;
        expect(flatten(documents.map(_ => _.resource.relations.depicts))).toEqual([]);
        await helpers.expectDocuments('i1', 'i2');
        done();
    });


    it('update', async done => {

        let t1 = doc('', 'identifiert1', 'Feature', 't1') as FieldDocument;
        let t2 = doc('', 'identifiert2', 'Feature', 't2') as FieldDocument;
        t1.resource.relations = { isAfter: ['t2'], isRecordedIn: [] };
        t2.resource.relations = { isBefore: ['t1'], isRecordedIn: [] };

        await app.datastore.create(t1, 'test');
        t2 = await app.datastore.create(t2, 'test') as any;

        const t2old = Document.clone(t2);
        t2.resource.relations['isBefore'] = [];
        t2.resource.identifier = 'identifiert2new';

        await app.relationsManager.update(t2, t2old);
        t1 = await app.datastore.get('t1') as any;
        t2 = await app.datastore.get('t2') as any;

        expect(t2.resource.relations.isBefore).toEqual([]);
        expect(t1.resource.relations.isAfter).toEqual([]);

        expect(t2old.resource.relations.isBefore).toEqual(['t1']);

        done();
    });
});
