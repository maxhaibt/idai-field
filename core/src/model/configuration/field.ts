import { isArray, isObject, isString } from 'tsfun';
import { I18N } from '../../tools/i18n';
import { validateFloat, validateInt, validateUnsignedFloat, validateUnsignedInt, validateUrl } from '../../tools/validation-util';
import { parseDate } from '../../tools/parse-date';
import { Dating } from '../dating';
import { Dimension } from '../dimension';
import { Literature } from '../literature';
import { OptionalRange } from '../optional-range';
import { Valuelist } from './valuelist';


/**
 * @author Daniel de Oliveira
 * @author Thomas Kleinke
 */
export interface Field extends BaseField {

    inputTypeOptions?: { validation?: { permissive?: true } };
    valuelistFromProjectField?: string;
    editable?: boolean;                 // defaults to true
    visible?: boolean;                  // defaults to true
    selectable?: boolean;               // defaults to true
    fulltextIndexed?: boolean;
    constraintIndexed?: boolean;
    defaultConstraintIndexed?: boolean;
    mandatory?: true;
    fixedInputType?: true;
    allowOnlyValuesOfParent?: true;
    maxCharacters?: number;
    source?: Field.SourceType;
    subfields?: Array<Subfield>;
}


export interface Subfield extends BaseField {

    condition?: SubfieldCondition;
}

export interface BaseField extends I18N.LabeledValue, I18N.Described {

    inputType: Field.InputType;
    defaultLabel?: I18N.String;
    defaultDescription?: I18N.String;
    valuelist?: Valuelist;
}

export interface SubfieldCondition {

    subfieldName: string;
    values: string[]|boolean;
}


export module Field {

    export type SourceType = 'builtIn'|'library'|'custom'|'common';

    export const INPUTTYPE = 'inputType';
    export const SOURCE = 'source';
    export const VISIBLE = 'visible';
    export const MANDATORY = 'mandatory';
    export const EDITABLE = 'editable';
    export const NAME = 'name';
    export const LABEL = 'label';
    export const DESCRIPTION = 'description';
    export const FULLTEXTINDEXED = 'fulltextIndexed';
    export const CONSTRAINTINDEXED = 'constraintIndexed';
    export const GROUP = 'group';


    export module Source {

        export const BUILTIN = 'builtIn';
        export const LIBRARY = 'library';
        export const CUSTOM = 'custom';
        export const COMMON = 'common';
    }


    export type InputType = 'input'
        |'simpleInput'
        |'unsignedInt'
        |'unsignedFloat'
        |'int'
        |'float'
        |'text'
        |'url'
        |'multiInput'
        |'simpleMultiInput'
        |'dropdown'
        |'dropdownRange'
        |'radio'
        |'boolean'
        |'checkboxes'
        |'dating'
        |'date'
        |'dimension'
        |'literature'
        |'geometry'
        |'relation'
        |'instanceOf'
        |'default'
        |'category'
        |'identifier'
        |'composite';


    export module InputType {

        export const INPUT = 'input';
        export const SIMPLE_INPUT = 'simpleInput';
        export const UNSIGNEDINT = 'unsignedInt';
        export const UNSIGNEDFLOAT = 'unsignedFloat';
        export const INT = 'int';
        export const FLOAT = 'float';
        export const TEXT = 'text';
        export const MULTIINPUT = 'multiInput';
        export const SIMPLE_MULTIINPUT = 'simpleMultiInput';
        export const URL = 'url';
        export const DROPDOWN = 'dropdown';
        export const DROPDOWNRANGE = 'dropdownRange';
        export const RADIO = 'radio';
        export const BOOLEAN = 'boolean';
        export const CHECKBOXES = 'checkboxes';
        export const DATING = 'dating';
        export const DATE = 'date';
        export const DIMENSION = 'dimension';
        export const LITERATURE = 'literature';
        export const GEOMETRY = 'geometry';
        export const INSTANCE_OF = 'instanceOf';
        export const RELATION = 'relation';
        export const CATEGORY = 'category';
        export const IDENTIFIER = 'identifier';
        export const COMPOSITE = 'composite';
        export const NONE = 'none';
        export const DEFAULT = 'default';

        export const VALUELIST_INPUT_TYPES = [DROPDOWN, DROPDOWNRANGE, CHECKBOXES, RADIO, DIMENSION];
        export const NUMBER_INPUT_TYPES = [UNSIGNEDINT, UNSIGNEDFLOAT, INT, FLOAT];
        export const I18N_COMPATIBLE_INPUT_TYPES = [INPUT, SIMPLE_INPUT, TEXT, MULTIINPUT, SIMPLE_MULTIINPUT];
        export const I18N_INPUT_TYPES = [INPUT, TEXT, MULTIINPUT];
        export const SIMPLE_INPUT_TYPES = [SIMPLE_INPUT, SIMPLE_MULTIINPUT];
        export const SUBFIELD_INPUT_TYPES = [INPUT, SIMPLE_INPUT, TEXT, BOOLEAN, DROPDOWN, RADIO, CHECKBOXES,
            FLOAT, UNSIGNEDFLOAT, INT, UNSIGNEDINT, DATE, URL];

        const INTERCHANGEABLE_INPUT_TYPES: Array<Array<InputType>> = [
            [INPUT, SIMPLE_INPUT, TEXT, DROPDOWN, RADIO],
            [MULTIINPUT, SIMPLE_MULTIINPUT, CHECKBOXES]
        ];

        
        export function getInterchangeableInputTypes(inputType: InputType): Array<InputType> {

            const alternativeTypes: Array<InputType>|undefined = INTERCHANGEABLE_INPUT_TYPES.find(types => {
                return types.includes(inputType);
            });

            return alternativeTypes ?? [];
        }


        export function isValidFieldData(fieldData: any, inputType: InputType): boolean {

            switch (inputType) {
                case SIMPLE_INPUT:
                case DROPDOWN:
                case RADIO:
                case CATEGORY:
                case IDENTIFIER:
                    return isString(fieldData);
                case INPUT:
                case TEXT:
                    // TODO Improve validation for i18n strings
                    return isString(fieldData) || isObject(fieldData);
                case SIMPLE_MULTIINPUT:
                case CHECKBOXES:
                    return isArray(fieldData) && fieldData.every(element => isString(element));
                case MULTIINPUT:
                    return isArray(fieldData) && fieldData.every(element => isString(element) || isObject(element));
                case UNSIGNEDINT:
                    return validateUnsignedInt(fieldData);
                case UNSIGNEDFLOAT:
                    return validateUnsignedFloat(fieldData);
                case INT:
                    return validateInt(fieldData);
                case FLOAT:
                    return validateFloat(fieldData);
                case URL:
                    return validateUrl(fieldData);
                case BOOLEAN:
                    return fieldData === true || fieldData === false;
                case DATE:
                    return !isNaN(parseDate(fieldData)?.getTime());
                case DROPDOWNRANGE:
                    return OptionalRange.buildIsOptionalRange(isString)(fieldData);
                case DATING:
                    return isArray(fieldData) && fieldData.every(element => Dating.isDating(element));
                case DIMENSION:
                    return isArray(fieldData) && fieldData.every(element => Dimension.isDimension(element));
                case LITERATURE:
                    return isArray(fieldData) && fieldData.every(element => Literature.isLiterature(element));
                case GEOMETRY:
                    return fieldData.type !== undefined && fieldData.coordinates !== undefined;
                case RELATION:
                case INSTANCE_OF:
                    return isObject(fieldData) && Object.values(fieldData).every(relationTargets => {
                        return isArray(relationTargets) && relationTargets.every(element => isString(element));
                    });
                default:
                    return true;
            }
        }
    }
}
