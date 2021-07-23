import { isDefined, flow, on, separate, detach, map, reduce, clone, not, flatten, set, Map, values, isUndefined } from 'tsfun';
import { Category, Field, Group, Groups, Relation, Resource } from '../../model';
import { Forest, Tree } from '../../tools';
import { linkParentAndChildInstances } from '../category-forest';
import {LibraryCategoryDefinition} from '../model';
import { TransientCategoryDefinition } from '../model/transient-category-definition';
import { ConfigurationErrors } from './configuration-errors';


const TEMP_FIELDS = 'fields';
const TEMP_GROUPS = 'tempGroups';


/**
 * @author Thomas Kleinke
 * @author Daniel de Oliveira
 * @author Sebastian Cuy
 */
export const makeCategoryForest = (relationDefinitions: Array<Relation>, selectedParentCategories?: string[]) =>
        (categories: Map<TransientCategoryDefinition>): Forest<Category> => {

    const [parentDefs, childDefs] =
            flow(categories,
                values,
                separate(on(LibraryCategoryDefinition.PARENT, isUndefined)));

    const parentCategories = flow(
        parentDefs,
        map(buildCategoryFromDefinition),
        map(category => ({ item: category, trees: [] }))
    );

    return flow(
        childDefs,
        reduce(addChildCategory(selectedParentCategories), parentCategories),
        Tree.mapForest(createGroups(relationDefinitions)),
        Tree.mapForest(detach(TEMP_FIELDS)),
        Tree.mapForest(detach(TEMP_GROUPS)),
        linkParentAndChildInstances
    );
}


const createGroups = (relationDefinitions: Array<Relation>) => (category: Category): Category => {

    const categoryRelations: Array<Relation> = Relation.getRelations(
        relationDefinitions, category.name
    );

    category.groups = category[TEMP_GROUPS].map(groupDefinition => {
        const group = Group.create(groupDefinition.name);
        group.fields = set(groupDefinition.fields)
            .map(fieldName => {
                return category[TEMP_FIELDS][fieldName]
                    ?? categoryRelations.find(relation => relation.name === fieldName)
            })
            .filter(field => field !== undefined)
        return group;
    });

    completeStemGroup(category);
    putCoreFieldsToHiddenGroup(category);

    return category;
}


function completeStemGroup(category: Category) {

    const fieldsInGroups: string[] = (flatten(1, category[TEMP_GROUPS].map(group => group.fields)) as string[]);
    const fieldsNotInGroups: Array<Field> = Object.keys(category[TEMP_FIELDS])
        .filter(fieldName => !fieldsInGroups.includes(fieldName)
            && (category[TEMP_FIELDS][fieldName].visible || category[TEMP_FIELDS][fieldName].editable))
        .map(fieldName => category[TEMP_FIELDS][fieldName]);

    if (fieldsNotInGroups.length === 0) return;

    let stemGroup: Group = category.groups.find(group => group.name === 'stem');
    if (!stemGroup) {
        stemGroup = Group.create('stem');
        category.groups.unshift(stemGroup);
    }

    stemGroup.fields = stemGroup.fields.concat(fieldsNotInGroups);
}


function putCoreFieldsToHiddenGroup(category: Category) {

    if (!category[TEMP_FIELDS][Resource.ID]) return;

    category.groups.push({
        name: Groups.HIDDEN_CORE_FIELDS,
        fields: [
            category[TEMP_FIELDS][Resource.ID]
        ]
    });
}


const addChildCategory = (selectedParentCategories?: string[]) =>
                            (categoryTree: Forest<Category>,
                             childDefinition: TransientCategoryDefinition): Forest<Category> => {

    const found = categoryTree.find(({ item: category }) => {
        return category.name === childDefinition.parent
            && (!selectedParentCategories || selectedParentCategories.includes(category.libraryId));
    });
    if (!found) return categoryTree;
    
    const { item: category, trees: trees } = found;

    const childCategory = buildCategoryFromDefinition(childDefinition);
    childCategory[TEMP_FIELDS] = makeChildFields(category, childCategory);

    trees.push({ item: childCategory, trees: [] });
    return categoryTree;
}


function buildCategoryFromDefinition(definition: any/* TransientCategoryDefinition */): Category {

    const category: any = {};
    category.mustLieWithin = definition.mustLieWithin;
    category.name = definition.name;
    category.libraryId = definition.libraryId;
    category.label = definition.label;
    category.source = definition.source;
    category.description = definition.description;
    category.defaultLabel = definition.defaultLabel;
    category.defaultDescription = definition.defaultDescription;
    category.groups = [];
    category.isAbstract = definition.abstract || false;
    category.color = definition.color ?? Category.generateColorForCategory(category.name);
    category.defaultColor = definition.defaultColor ?? Category.generateColorForCategory(category.name);
    category.children = [];
    category.userDefinedSubcategoriesAllowed = definition.userDefinedSubcategoriesAllowed;
    category.required = definition.required;

    category[TEMP_FIELDS] = definition.fields || {};
    Object.keys(category[TEMP_FIELDS]).forEach(fieldName => category[TEMP_FIELDS][fieldName].name = fieldName);

    category[TEMP_GROUPS] = definition.groups || [];

    return category as Category;
}


function makeChildFields(category: Category, child: Category): Array<Field> {

    try {
        const childFields = child[TEMP_FIELDS];
        return getCombinedFields(category[TEMP_FIELDS], childFields);
    } catch (errWithParams) {
        errWithParams.push(category.name);
        errWithParams.push(child.name)
        throw [errWithParams];
    }
}


function getCombinedFields(parentFields: Array<Field>,
                           childFields: Array<Field>): Array<Field> {

    const fields = clone(parentFields);

    Object.keys(childFields).forEach(fieldName => {
        if (fields[fieldName]) {
            if (fieldName !== 'campaign') {
                throw [
                    ConfigurationErrors.TRIED_TO_OVERWRITE_PARENT_FIELD,
                    fieldName
                ];
            }
        } else {
            fields[fieldName] = childFields[fieldName];
        }
    });

    return fields;
}
