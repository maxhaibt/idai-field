import {ProjectCategories} from '../../../../src/app/core/configuration/project-categories';
import isGeometryCategory = ProjectCategories.isGeometryCategory;
import getFieldCategories = ProjectCategories.getFieldCategories;
import {sameset} from 'tsfun';
import {Named, toName} from '../../../../src/app/core/util/named';
import {Treelist} from '../../../../src/app/core/util/treelist';
import {Category} from '../../../../src/app/core/configuration/model/category';
import getConcreteFieldCategories = ProjectCategories.getConcreteFieldCategories;
import getRegularCategoryNames = ProjectCategories.getRegularCategoryNames;
import getImageCategoryNames = ProjectCategories.getImageCategoryNames;
import getTypeCategories = ProjectCategories.getTypeCategories;
import getOverviewTopLevelCategories = ProjectCategories.getOverviewToplevelCategories;
import getOverviewCategoryNames = ProjectCategories.getOverviewCategoryNames;
import getOverviewCategories = ProjectCategories.getOverviewCategories;


describe('ProjectCategories', () => {

    const categoryTreelist: Treelist<Named> = [
        {
            node: { name: 'Image' },
            trees: [
                {
                    node: {name: 'Drawing'},
                    trees: []
                }
            ]
        },
        {
            node: { name: 'Operation' },
            trees: [
                {
                    node: {name: 'Trench'},
                    trees: []
                }
            ]
        },
        {
            node: { name: 'Place' },
            trees: []
        },
        {
            node: {name: 'Inscription'},
            trees: []
        },
        {
            node: {name: 'Type'},
            trees: []
        },
        {
            node: {name: 'TypeCatalog'},
            trees: []
        },
        {
            node: {name: 'Project'},
            trees: []
        },
        {
            node: {name: 'Find'},
            trees: []
        }
    ];


    it('isGeometryCategory', () => {

        expect(isGeometryCategory(categoryTreelist, 'Image')).toBeFalsy();
        expect(isGeometryCategory(categoryTreelist, 'Drawing')).toBeFalsy();
        expect(isGeometryCategory(categoryTreelist, 'Type')).toBeFalsy();
        expect(isGeometryCategory(categoryTreelist, 'TypeCatalog')).toBeFalsy();
        expect(isGeometryCategory(categoryTreelist, 'Inscription')).toBeFalsy();
        expect(isGeometryCategory(categoryTreelist, 'Project')).toBeFalsy();
        expect(isGeometryCategory(categoryTreelist, 'Operation')).toBeTruthy();
        expect(isGeometryCategory(categoryTreelist, 'Project')).toBeFalsy();
    });


    it('getFieldCategories', () => {

        expect(
            sameset(
                getFieldCategories(categoryTreelist as Treelist<Category>).map(toName),
                ['Operation', 'Trench', 'Inscription', 'Type', 'TypeCatalog', 'Find', 'Place'])
        ).toBeTruthy();
    });


    it('getConcreteFieldCategories', () => {

        expect(
            sameset(
                getConcreteFieldCategories(categoryTreelist as Treelist<Category>).map(toName),
                ['Operation', 'Trench', 'Inscription', 'Find', 'Place'])
        ).toBeTruthy();
    });


    it('getRegularCategoryNames', () => {

        expect(
            sameset(
                getRegularCategoryNames(categoryTreelist as Treelist<Category>),
                ['Inscription', 'Find'])
        ).toBeTruthy();
    });


    it('getImageCategoryNames', () => {

        expect(
            sameset(
                getImageCategoryNames(categoryTreelist as Treelist<Category>),
                ['Image', 'Drawing'])
        ).toBeTruthy();
    });


    it('getTypeCategories', () => {

        expect(
            sameset(
                getTypeCategories(categoryTreelist as Treelist<Category>).map(toName),
                ['TypeCatalog', 'Type'])
        ).toBeTruthy();
    });


    it('getOverviewToplevelCategories', () => {

        expect(
            sameset(
                getOverviewTopLevelCategories(categoryTreelist as Treelist<Category>).map(toName),
                ['Operation', 'Place'])
        ).toBeTruthy();
    });


    it('getOverviewCategories', () => {

        expect(
            sameset(
                getOverviewCategories(categoryTreelist as Treelist<Category>),
                ['Trench', 'Place'])
        ).toBeTruthy();
    });


    it('getOverviewCategoryNames', () => {

        expect(
            sameset(
                getOverviewCategoryNames(categoryTreelist as Treelist<Category>),
                ['Operation', 'Trench', 'Place'])
        ).toBeTruthy();
    });
});
