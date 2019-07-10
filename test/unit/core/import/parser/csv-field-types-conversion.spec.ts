import {Dating, Dimension, IdaiType, Resource} from 'idai-components-2';
import {CsvFieldTypesConversion} from '../../../../../app/core/import/parser/csv-field-types-conversion';
import {CsvParser} from '../../../../../app/core/import/parser/csv-parser';


/**
 * @author Daniel de Oliveira
 */

describe('CsvFieldTypesConversion', () => {

    it('field type boolean', () => {

        const type = {
            name: 'TypeName',
            fields: [{
                name: 'Bool1',
                inputType: 'boolean'
            }, {
                name: 'Bool2',
                inputType: 'boolean'
            }],
        } as IdaiType;

        const result = CsvFieldTypesConversion
            .convertFieldTypes(type)({Bool1: 'true', Bool2: 'false'} as unknown as Resource);

        expect(result['Bool1']).toBe(true);
        expect(result['Bool2']).toBe(false);
    });


    it('field type dating', () => {

        const type = {
            name: 'TypeName',
            fields: [{
                name: 'dating',
                inputType: 'dating'
            }],
        } as IdaiType;

        // TODO write test for csv parser that makes sure dating is build up properly
        const resource = CsvFieldTypesConversion
            .convertFieldTypes(type)({
                dating: [{
                    type: 'range',
                    begin: { type: 'bce', year: '0' },
                    end: { type: 'bce', year: '1' },
                    margin: '1',
                    source: 'abc',
                    isImprecise: 'true',
                    isUncertain: 'false'
                }]
            } as unknown as Resource);


        const dating: Dating = resource.dating[0];
        expect(dating.type).toBe('range');
        expect(dating.begin.type).toBe('bce');
        expect(dating.begin.year).toBe(0);
        expect(dating.end.type).toBe('bce');
        expect(dating.end.year).toBe(1);
        expect(dating.margin).toBe(1);
        expect(dating.source).toBe('abc');
        expect(dating.isImprecise).toBe(true);
        expect(dating.isUncertain).toBe(false);
    });


    it('field type dimension', async done => {

        const type = {
            name: 'TypeName',
            fields: [{
                name: 'Dim',
                inputType: 'dimension'
            }],
        } as IdaiType;

        const resource = CsvFieldTypesConversion
            .convertFieldTypes(type)({
                Dim: [{
                    value: '1',
                    rangeMin: '2',
                    rangeMax: '3',
                    inputValue: '4',
                    inputRangeEndValue: '5',
                    measurementPosition: 'a',
                    measurementComment: 'b',
                    inputUnit: 'mm',
                    isImprecise: 'true',
                    isRange: 'false'
                }]
            } as unknown as Resource);

        const dimension: Dimension = resource['Dim'][0];
        expect(dimension.value).toBe(1);
        expect(dimension.rangeMin).toBe(2);
        expect(dimension.rangeMax).toBe(3);
        expect(dimension.inputValue).toBe(4);
        expect(dimension.inputRangeEndValue).toBe(5);
        expect(dimension.measurementPosition).toBe('a');
        expect(dimension.measurementComment).toBe('b');
        expect(dimension.inputUnit).toBe('mm'); // TODO add validation for range of values
        expect(dimension.isImprecise).toBe(true);
        expect(dimension.isRange).toBe(false);
        done();
    });
});