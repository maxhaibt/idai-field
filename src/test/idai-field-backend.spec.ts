import {fdescribe, describe, expect, fit, it, xit, inject, beforeEach, beforeEachProviders} from 'angular2/testing';
import {IdaiFieldBackend} from "../app/services/idai-field-backend";
import {ModelUtils} from "../app/model/model-utils";
import {provide} from "angular2/core";
import {IdaiFieldObject} from "../app/model/idai-field-object";
import filter = webdriver.promise.filter;
import {Headers} from "angular2/http";

/**
 * @author Daniel M. de Oliveira
 * @author Thomas Kleinke
 */
export function main() {
    describe('IdaiFieldBackend', () => {

        var config = {
            backend : {
                uri : "uri",
                credentials: "user:password",
            }
        };

        var object = { "id": "id1", "identifier": "ob1", "title": "Object 1", "synced": 0, "valid": true,
            "type": "Object", "relations": [] };

        var filteredObject = { "resource" : { "id": "id1", "identifier": "ob1", "title": "Object 1", "type": "Object",
            "relations": [] }, "dataset" : "dataset1" };

        var successFunction = function() {
            return {
                subscribe: function(suc,err) {
                    suc("ok");
                }
            };
        };

        var failFunction = function() {
            return {
                subscribe: function(suc,err) {
                    err("fail");
                }
            };
        };

        var put = function(obj: IdaiFieldObject) {
            return {
                subscribe: function(suc, err) {
                    suc(obj);
                }
            };
        };

        var mockHttp;

        var mockDataModelConfiguration;
        var idaiFieldBackend : IdaiFieldBackend;
        var j;

        beforeEachProviders(() => [
            provide(ModelUtils, {useClass: ModelUtils})
        ]);

        beforeEach(function(){
            mockHttp = jasmine.createSpyObj('mockHttp', [ 'get', 'put' ]);
            mockHttp.get.and.callFake(successFunction);
            mockHttp.put.and.callFake(put);
            mockDataModelConfiguration = jasmine.createSpyObj('mockDataModelConfiguration', ['getField']);
            mockDataModelConfiguration.getField.and.callFake(function(){return "dataset1";});

            idaiFieldBackend = new IdaiFieldBackend(mockHttp, config, mockDataModelConfiguration);
            j=0;
        });

        it('report it is connected',
            function(){

                idaiFieldBackend.isConnected().subscribe(connected => {
                    if (j==1) expect(connected).toBeTruthy();
                    j++;
                });

                mockHttp.get.and.callFake(failFunction);
                idaiFieldBackend.checkConnection();
                mockHttp.get.and.callFake(successFunction);
                idaiFieldBackend.checkConnection();

                expect(j).toBe(2);
            }
        );

        it('should report is not connected',
            function(){

                idaiFieldBackend.isConnected().subscribe(connected => {
                    if (j==0) expect(connected).toBeFalsy();
                    j++;
                });

                mockHttp.get.and.callFake(failFunction);
                idaiFieldBackend.checkConnection();

                expect(j).toBe(1);
            }
        );

        it('should save an object to the backend',
            function(done) {

                var headers: Headers = new Headers();
                headers.append('Authorization', 'Basic ' + btoa(config.backend.credentials));

                idaiFieldBackend.save(object).then(obj => {
                    expect(mockHttp.put).toHaveBeenCalledWith(config.backend.uri + 'objects/' + object.id,
                        JSON.stringify(filteredObject), { headers: headers });
                    done();
                }).catch(err => {
                    fail(err);
                    done();
                });
            }
        );
    })
}