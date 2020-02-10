import {ResultSets} from '../../../../../app/core/datastore/index/result-sets';

/**
 * @author Daniel de Oliveira
 * @author Thomas Kleinke
 */
describe('ResultSets', () => {

    it('basic stuff', () => {

        let r: ResultSets = ResultSets.make();

        ResultSets.combine(r, [{id:'1'},{id:'2'}] as any);
        ResultSets.combine(r,[{id:'2'},{id:'2'}] as any);
        ResultSets.combine(r,[{id:'2'},{id:'3'}] as any);

        expect(ResultSets.collapse(r)).toEqual([{id:'2'}] as any);
    });


    it('no intersection', () => {

        let r: ResultSets = ResultSets.make();

        ResultSets.combine(r,[{id:'1'},{id:'2'}] as any);
        ResultSets.combine(r,[{id:'3'},{id:'4'}] as any);

        expect(ResultSets.collapse(r)).toEqual([]);
    });


    it('no intersection with more results', () => {

        let r: ResultSets = ResultSets.make();

        ResultSets.combine(r,[{id:'1'},{id:'2'}] as any);
        ResultSets.combine(r,[{id:'2'},{id:'3'}] as any);
        ResultSets.combine(r,[{id:'4'},{id:'5'}] as any);

        expect(ResultSets.collapse(r)).toEqual([]);
    });


    it('subtract', () => {

        let r: ResultSets = ResultSets.make();

        ResultSets.combine(r,[{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }] as any);
        ResultSets.combine(r,[{ id: '3' }, { id: '4' }] as any, 'subtract');

        expect(ResultSets.collapse(r)).toEqual([{ id: '1' }, { id: '2' }] as any);
    });


    it('subtract and add multiple', () => {

        let r: ResultSets = ResultSets.make();

        ResultSets.combine(r,[{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }] as any);
        ResultSets.combine(r,[{ id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }] as any);
        ResultSets.combine(r,[{ id: '3' }] as any, 'subtract');
        ResultSets.combine(r,[{ id: '4' }] as any, 'subtract');

        expect(ResultSets.collapse(r)).toEqual([{ id: '2' }] as any);
    });
});