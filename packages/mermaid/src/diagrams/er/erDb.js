import { log } from '../../logger.js';
import { getConfig } from '../../diagram-api/diagramAPI.js';

import {
  setAccTitle,
  getAccTitle,
  getAccDescription,
  setAccDescription,
  clear as commonClear,
  setDiagramTitle,
  getDiagramTitle,
} from '../common/commonDb.js';

let entities = {};
let relationships = [];

const Cardinality = {
  ZERO_OR_ONE: 'ZERO_OR_ONE',
  ZERO_OR_MORE: 'ZERO_OR_MORE',
  ONE_OR_MORE: 'ONE_OR_MORE',
  ONLY_ONE: 'ONLY_ONE',
  MD_PARENT: 'MD_PARENT',
};

const Identification = {
  NON_IDENTIFYING: 'NON_IDENTIFYING',
  IDENTIFYING: 'IDENTIFYING',
};

const addEntity = function (name, alias = undefined) {
  if (entities[name] === undefined) {
    entities[name] = { attributes: new Map(), alias: alias };
    log.info('Added new entity :', name);
  } else if (entities[name] && !entities[name].alias && alias) {
    entities[name].alias = alias;
    log.info(`Add alias '${alias}' to entity '${name}'`);
  }

  return entities[name];
};

const getEntities = () => entities;

const addAttributes = function (entityName, attribs) {

  let entity = addEntity(entityName); // May do nothing (if entity has already been added)

  // Process attribs in reverse order due to effect of recursive construction (last attribute is first)
  let i;
  for (i = attribs.length - 1; i >= 0; i--) {
    const att = attribs[i];
    if(entity.attributes.has(att.attributeName)){
      updateAttribute(entity.attributes, att);
    }else{
      entity.attributes.set(att.attributeName,att);
      log.debug('Added attribute ', att.attributeName);
    }
  }
};
//may do nothing if item object contains only name
const updateAttribute = function(attributes, item){
  if(Object.keys(item).length === 1) {
    log.debug('Attribute contains only name, nothing to update', item.attributeName);
    return
  }
  const savedValue =attributes.get(item.entityName);
  const newValue = Object.assign({},savedValue,item);
  attributes.set(item.entityName,newValue);
  log.debug('Updated attribute ', item.attributeName);
}

/**
 * Add a relationship
 *
 * @param entA The first entity in the relationship
 * @param rolA The role played by the first entity in relation to the second
 * @param entB The second entity in the relationship
 * @param rSpec The details of the relationship between the two entities
 */
const addRelationship = function (entA, rolA, entB, rSpec) {
  let rel = {
    entityA: entA,
    roleA: rolA,
    entityB: entB,
    relSpec: rSpec,
  };

  relationships.push(rel);
  log.debug('Added new relationship :', rel);
};

/**
 * Add a relationship with attributes
 *
 * @param entA The first entity in the relationship
 * @param attA The first entity attribute in the relationship
 * @param rolA The role played by the first entity in relation to the second
 * @param entB The second entity in the relationship
 * @param attB The second entity attribute in the relationship
 * @param rSpec The details of the relationship between the two entities
 */
const addAttrRelationship = function(entA, attA, rolA, entB, attB, rSpec ){
  let rel = {
    entityA: entA,
    attributeA:attA,
    roleA: rolA,
    entityB: entB,
    attributeB:attB,
    relSpec: rSpec,
  };
  relationships.push(rel);
  log.debug('Added new relationship :', rel);

};

const getRelationships = () => relationships;

const clear = function () {
  entities = {};
  relationships = [];
  commonClear();
};

export default {
  Cardinality,
  Identification,
  getConfig: () => getConfig().er,
  addEntity,
  addAttributes,
  getEntities,
  addRelationship,
  addAttrRelationship,
  getRelationships,
  clear,
  setAccTitle,
  getAccTitle,
  setAccDescription,
  getAccDescription,
  setDiagramTitle,
  getDiagramTitle,
};
