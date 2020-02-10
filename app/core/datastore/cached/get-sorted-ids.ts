import {on, is, isNot, undefinedOrEmpty, to, first,
    flow, equal, Pair, copy, map} from 'tsfun';
import {Query} from 'idai-components-2';
import {IndexItem, TypeResourceIndexItem} from '../index/index-item';
import {SortUtil} from '../../util/sort-util';
import {Name, ResourceId} from '../../constants';
import {isUndefinedOrEmpty} from 'tsfun/src/predicate';
import {pairWith, count /* TODO move to tsfun */, size} from '../../util/utils';


// @author Daniel de Oliveira
// @author Thomas Kleinke


const ID = 'id';
const IDENTIFIER = 'identifier';
const MATCH_TYPE = 'matchType';

type Percentage = number;


/**
 * @param indexItems
 * @param query
 */
export function getSortedIds(indexItems: Array<IndexItem>,
                             query: Query): Array<ResourceId> {

    indexItems = shouldRankTypes(query)
        ? handleTypesForName(
            indexItems as Array<TypeResourceIndexItem>,
            query.rankOptions[MATCH_TYPE])
        : generateOrderedResultList(indexItems);

    if (shouldHandleExactMatch(query)) {
        handleExactMatch(indexItems, query);
    }
    return indexItems.map(to(ID));
}


function shouldHandleExactMatch(query: Query) {

    return query.sort === 'exactMatchFirst' && isNot(undefinedOrEmpty)(query.q)
}


function shouldRankTypes(query: Query) {

    return equal(query.types)(['Type'])
        && query.rankOptions
        && query.rankOptions[MATCH_TYPE];
}


function handleTypesForName(indexItems: Array<TypeResourceIndexItem>,
                            rankTypesFor: Name): Array<IndexItem> {

    const pairWithPercentage_ = pairWithPercentage(rankTypesFor);

    return flow(
        indexItems,
        map(pairWithPercentage_),
        sort(comparePercentages),
        map(first));
}


function sort<A>(f: Function) {

    return (as: Array<A>) => copy(as).sort(f as any);
}


function comparePercentages(a: Pair<TypeResourceIndexItem, Percentage>,
                            b: Pair<TypeResourceIndexItem, Percentage>) {

    if (a[1] < b[1]) return 1;
    if (a[1] === b[1]) {

        if (size(a[0].instances) < size(b[0].instances)) return 1;
        return -1;
    }
    return -1;
}


function pairWithPercentage(rankTypesFor: Name) {

    return pairWith((indexItem: TypeResourceIndexItem) => {

        const instances = indexItem.instances;
        if (isUndefinedOrEmpty(instances)) return 0;
        return count(is(rankTypesFor))(instances) * 100 / size(instances);
    })
}


function handleExactMatch(indexItems: Array<IndexItem>,
                          query: Query) {

    const exactMatch = indexItems.find(on(IDENTIFIER, is(query.q)));

    if (exactMatch) {
        indexItems.splice(indexItems.indexOf(exactMatch), 1);
        indexItems.unshift(exactMatch);
    }
}


function generateOrderedResultList(items: Array<IndexItem>): Array<IndexItem> {

    return copy(items)
        .sort((a: IndexItem, b: IndexItem) =>
            // we know that an IndexItem created with from has the identifier field
            SortUtil.alnumCompare(a.identifier, b.identifier));
}