import {browser} from 'protractor';
import {NavbarPage} from '../navbar.page';
import {ResourcesPage} from './resources.page';
import {DoceditPage} from '../docedit/docedit.page';

const delays = require('../config/delays');
const common = require('../common');


describe('resources/list --', () => {

    let index = 0;


    beforeAll(function() {
        ResourcesPage.get();
        browser.sleep(delays.shortRest);
        ResourcesPage.clickHierarchyButton('S1');
        browser.sleep(delays.shortRest);
        ResourcesPage.clickListModeButton();
        browser.sleep(delays.shortRest);
    });


    beforeEach(async done => {

        if (index > 0) {
            NavbarPage.performNavigateToSettings();
            await common.resetApp();
            browser.sleep(delays.shortRest);
            NavbarPage.navigate('project');
            browser.sleep(delays.shortRest * 2);
            ResourcesPage.clickHierarchyButton('S1');
            browser.sleep(delays.shortRest);
            ResourcesPage.clickListModeButton();
            browser.sleep(delays.shortRest);
        }

        index++;
        done();
    });


    it('show newly created resource in list view', () => {

        ResourcesPage.performCreateResourceInList('1', 'feature-architecture');
        ResourcesPage.getListModeInputFieldValue('1', 0)
            .then(inputValue => expect(inputValue).toEqual('1'));
    });


    it('save changes on input field blur', () => {

        ResourcesPage.performCreateResourceInList('1', 'feature-architecture');
        ResourcesPage.performCreateResourceInList('2', 'feature-architecture');

        ResourcesPage.typeInListModeInputField('1', 1, 'Changed resource 1');
        ResourcesPage.getListModeInputField('2', 0).click();

        // TODO Missing expectation
    });


    it('navigate to child item view in list mode and create a new child object', () => {

        ResourcesPage.performCreateResourceInList('5', 'feature-architecture');
        ResourcesPage.clickHierarchyButton('5');
        ResourcesPage.performCreateResourceInList('child1', 'find');
        NavbarPage.navigate('project');
        ResourcesPage.clickHierarchyButton('S1');

        ResourcesPage.getListModeInputFieldValue('child1', 0)
            .then(inputValue => expect(inputValue).toEqual('child1'));
    });


    it('restore identifier from database if a duplicate identifier is typed in', () => {

        ResourcesPage.performCreateResourceInList('1', 'feature-architecture');
        ResourcesPage.performCreateResourceInList('2', 'feature-architecture');
        ResourcesPage.performCreateResourceInList('3', 'feature-architecture');

        ResourcesPage.typeInListModeInputField('2', 0, '1');
        ResourcesPage.getListModeInputField('3', 0).click();

        expect(NavbarPage.getMessageText()).toContain('existiert bereits');

        ResourcesPage.getListModeInputFieldValue('2', 0)
            .then(inputValue => expect(inputValue).toEqual('2'));
        NavbarPage.clickCloseAllMessages();
    });


    it('edit a resource via editor modal', () => {

       ResourcesPage.clickListEditButton('SE0');
       DoceditPage.typeInInputField('shortDescription', 'Test');
       DoceditPage.clickSaveDocument();
       ResourcesPage.getListModeInputFieldValue('SE0', 0)
           .then(inputValue => expect(inputValue).toEqual('SE0'));
       ResourcesPage.getListModeInputFieldValue('SE0', 1)
           .then(inputValue => expect(inputValue).toEqual('Test'));
    });
});