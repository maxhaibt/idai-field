import {browser, protractor, element, by} from 'protractor';
import {DocumentEditWrapperPage} from '../widgets/document-edit-wrapper.page';

let resourcesPage = require('./resources.page');
let documentViewPage = require('../widgets/document-view.page');
let EC = protractor.ExpectedConditions;
let delays = require('../config/delays');


/**
 * @author Daniel de Oliveira
 * @author Thomas Kleinke
 */
describe('resources --', function() {


    beforeEach(function() {
        resourcesPage.get();
        browser.wait(EC.visibilityOf(element(by.id('idai-field-brand'))), delays.ECWaitTime);
    });

    it('find it by its identifier', function() {
        resourcesPage.performCreateResource('1');
        resourcesPage.typeInIdentifierInSearchField('1');
        browser.wait(EC.presenceOf(resourcesPage.getListItemEl('1')),delays.ECWaitTime);
    });

    it('show only resources of the selected type', function() {
        resourcesPage.performCreateResource('1', 0);
        resourcesPage.performCreateResource('2', 1);
        resourcesPage.clickChooseTypeFilter(2);
        resourcesPage.clickChooseTypeFilter(1);
        browser.wait(EC.stalenessOf(resourcesPage.getListItemEl('1')), delays.ECWaitTime);
        browser.wait(EC.presenceOf(resourcesPage.getListItemEl('2')), delays.ECWaitTime);
        resourcesPage.clickChooseTypeFilter(0);
        browser.wait(EC.presenceOf(resourcesPage.getListItemEl('1')), delays.ECWaitTime);
        browser.wait(EC.stalenessOf(resourcesPage.getListItemEl('2')), delays.ECWaitTime);
        resourcesPage.clickChooseTypeFilter('all');
        browser.wait(EC.presenceOf(resourcesPage.getListItemEl('1')), delays.ECWaitTime);
        browser.wait(EC.presenceOf(resourcesPage.getListItemEl('2')), delays.ECWaitTime)
    });

    it('not reflect changes in overview in realtime', function() {
        resourcesPage.performCreateResource('1a');
        resourcesPage.clickSelectResource('1a');
        documentViewPage.clickEditDocument();
        DocumentEditWrapperPage.typeInInputField('1b');
        expect(resourcesPage.getListItemIdentifierText(0)).toBe('1a');
    });

    /**
     * There has been a bug where this was not possible due to a faulty datastore implementation.
     */
    xit('restore a document properly', function() {
        resourcesPage.performCreateResource('old');
        resourcesPage.performCreateResource('2');
        resourcesPage.clickSelectResource('old');
        documentViewPage.clickEditDocument();
        DocumentEditWrapperPage.typeInInputField('new');
        resourcesPage.clickSelectResource('2');
        resourcesPage.clickDiscardInModal();
        expect(resourcesPage.getListItemIdentifierText(1)).toEqual('old');
    });

    /**
     * There has been a bug where clicking the new button without doing anything
     * led to leftovers of 'Neues Objekt' for every time the button was pressed.
     */
    it('remove a new object from the list if it has not been saved', function() {
        resourcesPage.performCreateResource('1');
        resourcesPage.clickCreateObject();
        resourcesPage.clickSelectResourceType();
        resourcesPage.clickSelectGeometryType("point");
        resourcesPage.clickCreateObject();
        resourcesPage.clickSelectResourceType();
        resourcesPage.clickSelectGeometryType("point");
        browser.wait(EC.presenceOf(resourcesPage.getListItemMarkedNewEl()), delays.ECWaitTime);
        resourcesPage.scrollUp();
        resourcesPage.clickSelectResource('1');
        expect(resourcesPage.getListItemIdentifierText(0)).toEqual('1');
    });

    it('should save changes via dialog modal', function() {
        resourcesPage.performCreateResource('1');
        resourcesPage.clickSelectResource('1');
        documentViewPage.clickEditDocument();
        DocumentEditWrapperPage.typeInInputField('2');
        DocumentEditWrapperPage.clickCloseEdit();
        resourcesPage.clickSaveInModal();
        expect(resourcesPage.getListItemIdentifierText(0)).toEqual('2');
    });

    it('should discard changes via dialog modal', function() {
        resourcesPage.performCreateResource('1');
        resourcesPage.clickSelectResource('1');
        documentViewPage.clickEditDocument();
        DocumentEditWrapperPage.typeInInputField('2');
        DocumentEditWrapperPage.clickCloseEdit();
        resourcesPage.clickDiscardInModal();
        expect(resourcesPage.getListItemIdentifierText(0)).toEqual('1');
    });

    it('should cancel dialog modal', function() {
        resourcesPage.performCreateResource('1');
        resourcesPage.clickSelectResource('1');
        documentViewPage.clickEditDocument();
        DocumentEditWrapperPage.typeInInputField('2');
        DocumentEditWrapperPage.clickCloseEdit();
        resourcesPage.clickCancelInModal();
        expect<any>(DocumentEditWrapperPage.getInputFieldValue(0)).toEqual('2');
    });

    it('should delete a resource', function() {
        resourcesPage.performCreateResource('1');
        browser.wait(EC.presenceOf(resourcesPage.getListItemEl('1')), delays.ECWaitTime);
        resourcesPage.clickSelectResource('1');
        documentViewPage.clickEditDocument();
        resourcesPage.clickDeleteDocument();
        resourcesPage.clickDeleteInModal();
        browser.wait(EC.stalenessOf(resourcesPage.getListItemEl('1')), delays.ECWaitTime);
    });
});
