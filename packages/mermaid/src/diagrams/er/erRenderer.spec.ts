import { vi } from 'vitest';
import { create } from 'd3';
import { setConfig } from '../../config.js';
import { generateId } from './erRenderer.js';

import RendererObj from './erRenderer.js';
import erDb from './erDb.js';
import erMarkers from './erMarkers.js';

interface erEntityAttribute {
  attributeName: string;
  attributeType?: string | null;
  attributeKeyTypeList?: string[] | null;
}
interface erEntity {
  alias?: string | null;
  attributes: Map<string, erEntityAttribute>;
}

interface erEntityCollection {
  [key: string]: erEntity;
}

const diagramStub = {
  parser: vi.fn(),
  //eslint-disable-next-line no-unused-labels
  db: {
    ...erDb,
    getEntities: vi.fn(() => new Object(null) as erEntityCollection),
    getRelationships: vi.fn(() => [] as object[]),
    getDiagramTitle: vi.fn(() => 'UnitTest ER Diagram'),
  },
  renderer: RendererObj,
  styles: vi.fn(),
  draw: () => diagramStub.renderer.draw(null, erId, null, diagramStub),
};

const config = {
  fontFamily: 'Arial',
  fontSize: 14,
  entityPadding: 6, // should be  by 3
  minEntityWidth: 20,
  minEntityHeight: 20,
  securityLevel: 'strict',
  stroke: 'green',
  arrowMarkerAbsolute: false,
  layoutDirection: 'TB', // default???
  diagramPadding: 10,
  titleTopMargin: 5,
  useMaxWidth: false,
};
setConfig(config);

// const lines =`erDiagram
//       PROJECT {
//         int OWNER PK
//         str NAME
//       }

//       TEAM_MEMBER {
//         int ID PK,UK
//         str NAME
//       }

//       PROJECT :: OWNER ||--|{ TEAM_MEMBER :: ID : "parent"
//       `;

const erId = 'mmdErDiagram';
const SVG_ROOT = create('svg');
const SVG_NODE = () => SVG_ROOT.node() as SVGElement;

function selectSpyFn(selector: string): SVGElement | object {
  const svgSelector = `[id='${erId}']`;

  if (selector === 'body') {
    return { select: selectSpyFn };
  }

  if (selector === svgSelector) {
    return SVG_ROOT;
  }
  throw Error('wrong select call');
}

vi.mock('d3', async (importOriginal) => {
  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod: any = await importOriginal();
  return {
    ...mod,
    select: selectSpyFn,
  };
});

interface BoxValue {
  sw: number;
  sh: number;
  bw: number;
  bh: number;
}
const InitContainer = function (p: Partial<BoxValue> = { sw: 100, sh: 200, bw: 10, bh: 20 }) {
  SVG_ROOT.attr('id', erId)
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', p.sw || 100)
    .attr('height', p.sh || 200);

  // define fake getBBox function due to JSDOM not implement it.
  // It used in inner render calculation.
  // All position in test will be wrong. But now we can test SVG markup tags
  // and all attributes not related to position math.
  Object.defineProperty(global.SVGElement.prototype, 'getBBox', {
    writable: true,
    value: vi.fn().mockReturnValue({
      x: 0,
      y: 0,
      width: p.bw || 10,
      height: p.bh || 20,
    }),
  });

  expect(SVG_ROOT.node()?.getBBox()).not.toBeNull();
  expect(SVG_ROOT.node()?.id).toBe(erId);
  expect(SVG_ROOT.attr('id')).toBe(erId);
};
const CleanContainer = function () {
  SVG_ROOT.html('');
};

describe('erRenderer', () => {
  beforeAll(() => InitContainer());
  beforeEach(() => CleanContainer());

  describe('generateId', () => {
    it('should be deterministic', () => {
      const id1 = generateId('hello world', 'my-prefix');
      const id2 = generateId('hello world', 'my-prefix');

      expect(id1).toBe(id2);
    });
  });

  describe('marker defeinitions', () => {
    it.each([
      erMarkers.ERMarkers.MD_PARENT_START,
      erMarkers.ERMarkers.MD_PARENT_END,
      erMarkers.ERMarkers.ONLY_ONE_START,
      erMarkers.ERMarkers.ONLY_ONE_END,
      erMarkers.ERMarkers.ONE_OR_MORE_START,
      erMarkers.ERMarkers.ONE_OR_MORE_END,
      erMarkers.ERMarkers.ZERO_OR_ONE_START,
      erMarkers.ERMarkers.ZERO_OR_ONE_END,
      erMarkers.ERMarkers.ZERO_OR_MORE_START,
      erMarkers.ERMarkers.ZERO_OR_MORE_END,
    ])('should create %p marker definition', (marker: string) => {
      diagramStub.draw();
      const markerElement = SVG_NODE().querySelector(`marker#${marker}`) as SVGMarkerElement;
      expect(markerElement).not.toBeNull();
      expect(markerElement.id).toBe(marker);
      expect(markerElement.querySelector('path')).not.toBeNull();
      expect(markerElement.childElementCount).toBe(1);
    });
  });

  describe('entity markup', () => {
    it('should create entity group', () => {
      const entities: erEntityCollection = {
        UnitTest: { attributes: new Map(), alias: 'Test' },
      };
      diagramStub.db.getEntities.mockReturnValue(entities);

      diagramStub.draw();
      const entityG = SVG_NODE().querySelectorAll('g');
      expect(entityG.length).toBe(1);
      expect(entityG[0].id.startsWith('entity-UnitTest')).toBe(true);
      expect(entityG[0].getAttribute('entity-name')).toBe('UnitTest');
    });

    it('should create entity title equal entity name', () => {
      const entities: erEntityCollection = {
        UnitTest: { attributes: new Map<string, erEntityAttribute>(), alias: null },
      };
      diagramStub.db.getEntities.mockReturnValue(entities);

      diagramStub.draw();
      const title = SVG_NODE().querySelector('g')?.querySelector('text') as SVGTextElement;
      expect(title.id.startsWith('text-entity-UnitTest')).toBe(true);
      expect(title.classList.length).toBe(2);
      expect(title.classList.toString()).toBe('er entityLabel');
      expect(title.style.fontFamily).toBe(config.fontFamily);
      expect(title.textContent).toBe('UnitTest');
    });

    it('should create entity title equal entity alias', () => {
      const entities: erEntityCollection = {
        UnitTest: { attributes: new Map(), alias: 'UnitTestAlias' },
      };
      diagramStub.db.getEntities.mockReturnValue(entities);

      diagramStub.draw();
      const title = SVG_NODE().querySelector('g')?.querySelector('text') as SVGTextElement;
      expect(title.id.startsWith('text-entity-UnitTest')).toBe(true);
      expect(title.classList.length).toBe(2);
      expect(title.classList.toString()).toBe('er entityLabel');
      expect(title.style.fontFamily).toBe(config.fontFamily);
      expect(title.textContent).toBe('UnitTestAlias');
    });

    it('should create row markup for entity attribute', () => {
      const entities: erEntityCollection = {
        UnitTest: { attributes: new Map(), alias: 'UnitTestAlias' },
      };
      entities.UnitTest.attributes.set('PKID', {
        attributeName: 'PKID',
      } as erEntityAttribute);

      diagramStub.db.getEntities.mockReturnValue(entities);

      diagramStub.draw();
      const entitySvg = SVG_NODE().querySelector("g[id^='entity-UnitTest']");
      const id = entitySvg?.id as string;
      const rows = entitySvg?.querySelectorAll('g') as NodeListOf<SVGGElement>;
      expect(rows.length).toBe(1);
      expect(rows[0].id.startsWith(`row-${id}`)).toBe(true);
      expect(rows[0].id.endsWith(`attr-1`)).toBe(true);
    });

    it('should create text markup for entity attribute: type', () => {
      const entities: erEntityCollection = {
        UnitTest: { attributes: new Map(), alias: 'UnitTestAlias' },
      };
      entities.UnitTest.attributes.set('PKID', {
        attributeType: 'int',
        attributeName: 'PKID',
      } as erEntityAttribute);

      diagramStub.db.getEntities.mockReturnValue(entities);

      diagramStub.draw();
      const entitySvg = SVG_NODE().querySelector("g[id^='entity-UnitTest']");
      const id = entitySvg?.id as string;
      const labels = entitySvg
        ?.querySelector('g')
        ?.querySelectorAll('text') as NodeListOf<SVGTextElement>;
      expect(labels.length).toBe(2);
      // type
      expect(labels[0].id.startsWith(`text-${id}`)).toBe(true);
      expect(labels[0].id.endsWith(`-attr-1-type`)).toBe(true);
      expect(labels[0].classList.length).toBe(2);
      expect(labels[0].classList.toString()).toBe('er entityLabel');
      expect(labels[0].style.fontFamily).toBe(config.fontFamily);
      expect(labels[0].textContent).toBe('int');
    });

    it('should create text markup for entity attribute: name', () => {
      const entities: erEntityCollection = {
        UnitTest: { attributes: new Map(), alias: 'UnitTestAlias' },
      };
      entities.UnitTest.attributes.set('PKID', {
        attributeType: 'int',
        attributeName: 'PKID',
      } as erEntityAttribute);

      diagramStub.db.getEntities.mockReturnValue(entities);

      diagramStub.draw();
      const entitySvg = SVG_NODE().querySelector("g[id^='entity-UnitTest']");
      const id = entitySvg?.id as string;
      const labels = entitySvg
        ?.querySelector('g')
        ?.querySelectorAll('text') as NodeListOf<SVGTextElement>;
      expect(labels.length).toBe(2);
      // name
      expect(labels[1].id.startsWith(`text-${id}`)).toBe(true);
      expect(labels[1].id.endsWith(`-attr-1-name`)).toBe(true);
      expect(labels[1].classList.length).toBe(2);
      expect(labels[1].classList.toString()).toBe('er entityLabel');
      expect(labels[1].style.fontFamily).toBe(config.fontFamily);
      expect(labels[1].textContent).toBe('PKID');
    });

    it('should create text markup for entity attribute: keys', () => {
      const entities: erEntityCollection = {
        UnitTest: { attributes: new Map(), alias: 'UnitTestAlias' },
      };
      entities.UnitTest.attributes.set('PKID', {
        attributeType: 'int',
        attributeName: 'PKID',
        attributeKeyTypeList: ['PK', 'UK'],
      } as erEntityAttribute);

      diagramStub.db.getEntities.mockReturnValue(entities);

      diagramStub.draw();
      const entitySvg = SVG_NODE().querySelector("g[id^='entity-UnitTest']");
      const id = entitySvg?.id as string;
      const labels = entitySvg
        ?.querySelector('g')
        ?.querySelectorAll('text') as NodeListOf<SVGTextElement>;
      expect(labels.length).toBe(3);
      // keys
      expect(labels[2].id.startsWith(`text-${id}`)).toBe(true);
      expect(labels[2].id.endsWith(`-attr-1-key`)).toBe(true);
      expect(labels[2].classList.length).toBe(2);
      expect(labels[2].classList.toString()).toBe('er entityLabel');
      expect(labels[2].style.fontFamily).toBe(config.fontFamily);
      expect(labels[2].textContent).toBe('PK,UK');
    });

    it('should create text markup for list of entity attributes', () => {
      const entities: erEntityCollection = {
        UnitTest: { attributes: new Map(), alias: 'UnitTestAlias' },
      };
      entities.UnitTest.attributes.set('PKID', {
        attributeType: 'int',
        attributeName: 'PKID',
        attributeKeyTypeList: ['PK', 'UK'],
      } as erEntityAttribute);

      entities.UnitTest.attributes.set('Name', {
        attributeType: 'str',
        attributeName: 'Name',
      } as erEntityAttribute);

      entities.UnitTest.attributes.set('Ref', {
        attributeType: 'GUID',
        attributeName: 'Ref',
        attributeKeyTypeList: ['FK'],
      } as erEntityAttribute);

      diagramStub.db.getEntities.mockReturnValue(entities);

      diagramStub.draw();
      const entitySvg = SVG_NODE().querySelector("g[id^='entity-UnitTest']");
      const id = entitySvg?.id as string;
      const rows = entitySvg?.querySelectorAll(
        "g[id^='row-entity-UnitTest']"
      ) as NodeListOf<SVGGElement>;
      expect(rows.length).toBe(3);
      const labels = [] as SVGTextElement[];
      rows.forEach((r) => {
        (r?.querySelectorAll('text') as NodeListOf<SVGTextElement>).forEach((v) => {
          labels.push(v);
        });
      });
      expect(labels.length).toBe(9);
      //
      expect(labels[0].id.startsWith(`text-${id}`)).toBe(true);
      expect(labels[0].id.endsWith(`-attr-1-type`)).toBe(true);
      expect(labels[0].textContent).toBe('int');

      expect(labels[1].id.startsWith(`text-${id}`)).toBe(true);
      expect(labels[1].id.endsWith(`-attr-1-name`)).toBe(true);
      expect(labels[1].textContent).toBe('PKID');

      expect(labels[2].id.startsWith(`text-${id}`)).toBe(true);
      expect(labels[2].id.endsWith(`-attr-1-key`)).toBe(true);
      expect(labels[2].textContent).toBe('PK,UK');

      expect(labels[3].id.startsWith(`text-${id}`)).toBe(true);
      expect(labels[3].id.endsWith(`-attr-2-type`)).toBe(true);
      expect(labels[3].textContent).toBe('str');

      expect(labels[4].id.startsWith(`text-${id}`)).toBe(true);
      expect(labels[4].id.endsWith(`-attr-2-name`)).toBe(true);
      expect(labels[4].textContent).toBe('Name');

      // created empty markup to keep table cols count equal in all rows
      expect(labels[5].id.startsWith(`text-${id}`)).toBe(true);
      expect(labels[5].id.endsWith(`-attr-2-key`)).toBe(true);
      expect(labels[5].textContent).toBe('');

      expect(labels[6].id.startsWith(`text-${id}`)).toBe(true);
      expect(labels[6].id.endsWith(`-attr-3-type`)).toBe(true);
      expect(labels[6].textContent).toBe('GUID');

      expect(labels[7].id.startsWith(`text-${id}`)).toBe(true);
      expect(labels[7].id.endsWith(`-attr-3-name`)).toBe(true);
      expect(labels[7].textContent).toBe('Ref');

      expect(labels[8].id.startsWith(`text-${id}`)).toBe(true);
      expect(labels[8].id.endsWith(`-attr-3-key`)).toBe(true);
      expect(labels[8].textContent).toBe('FK');
    });

    it('all rows int attribute table should have 2 cols', () => {
      const entities: erEntityCollection = {
        UnitTest: { attributes: new Map(), alias: 'UnitTestAlias' },
      };
      entities.UnitTest.attributes.set('PKID', {
        attributeType: 'int',
        attributeName: 'PKID',
      } as erEntityAttribute);

      entities.UnitTest.attributes.set('Name', {
        attributeType: 'str',
        attributeName: 'Name',
      } as erEntityAttribute);

      entities.UnitTest.attributes.set('Ref', {
        attributeType: 'GUID',
        attributeName: 'Ref',
      } as erEntityAttribute);

      diagramStub.db.getEntities.mockReturnValue(entities);

      diagramStub.draw();
      const entitySvg = SVG_NODE().querySelector("g[id^='entity-UnitTest']");
      const id = entitySvg?.id as string;
      const rows = entitySvg?.querySelectorAll(
        "g[id^='row-entity-UnitTest']"
      ) as NodeListOf<SVGGElement>;
      expect(rows.length).toBe(3);
      const txtId = `text-${id}`;
      rows.forEach((r) => {
        const lbls = r?.querySelectorAll(`text[id^='${txtId}']`) as NodeListOf<SVGTextElement>;
        expect(lbls.length).toBe(2);
      });
    });

    it('all rows int attribute table should have 3 cols', () => {
      const entities: erEntityCollection = {
        UnitTest: { attributes: new Map(), alias: 'UnitTestAlias' },
      };
      entities.UnitTest.attributes.set('PKID', {
        attributeType: 'int',
        attributeName: 'PKID',
      } as erEntityAttribute);

      entities.UnitTest.attributes.set('Name', {
        attributeType: 'str',
        attributeName: 'Name',
      } as erEntityAttribute);

      entities.UnitTest.attributes.set('Ref', {
        attributeType: 'GUID',
        attributeName: 'Ref',
      } as erEntityAttribute);

      entities.UnitTest.attributes.set('Uniq', {
        attributeType: 'int',
        attributeName: 'Uniq',
        attributeKeyTypeList: ['UK'],
      } as erEntityAttribute);

      entities.UnitTest.attributes.set('Value', {
        attributeType: 'int',
        attributeName: 'Value',
      } as erEntityAttribute);

      diagramStub.db.getEntities.mockReturnValue(entities);

      diagramStub.draw();
      const entitySvg = SVG_NODE().querySelector("g[id^='entity-UnitTest']");
      const id = entitySvg?.id as string;
      const rows = entitySvg?.querySelectorAll(
        "g[id^='row-entity-UnitTest']"
      ) as NodeListOf<SVGGElement>;
      expect(rows.length).toBe(5);
      const txtId = `text-${id}`;
      rows.forEach((r) => {
        const lbls = r?.querySelectorAll(`text[id^='${txtId}']`) as NodeListOf<SVGTextElement>;
        expect(lbls.length).toBe(3);
      });
    });

    it('should create valid markup for list of entities', () => {
      const entities: erEntityCollection = {
        UnitTest: { attributes: new Map(), alias: 'UnitTestAlias' },
        UnitTestEntity: { attributes: new Map() },
      };
      entities.UnitTest.attributes.set('PKID', {
        attributeType: 'int',
        attributeName: 'PKID',
        attributeKeyTypeList: ['PK', 'UK'],
      } as erEntityAttribute);

      entities.UnitTest.attributes.set('Name', {
        attributeType: 'str',
        attributeName: 'Name',
      } as erEntityAttribute);

      entities.UnitTestEntity.attributes.set('ID', {
        attributeType: 'int',
        attributeName: 'ID',
      } as erEntityAttribute);

      entities.UnitTestEntity.attributes.set('Ref', {
        attributeType: 'GUID',
        attributeName: 'Ref',
      } as erEntityAttribute);

      diagramStub.db.getEntities.mockReturnValue(entities);

      diagramStub.draw();
      const svgEntities = SVG_NODE().querySelectorAll(
        "g[id^='entity-UnitTest']"
      ) as NodeListOf<SVGGElement>;
      expect(svgEntities.length).toBe(2);
      const rows: SVGGElement[] = [];
      const text: SVGTextElement[] = [];
      svgEntities.forEach((e) => {
        (e?.querySelectorAll("g[id^='row-entity-UnitTest']") as NodeListOf<SVGGElement>).forEach(
          (r) => {
            rows.push(r);
          }
        );
        (
          e?.querySelectorAll("text[id^='text-entity-UnitTest']") as NodeListOf<SVGTextElement>
        ).forEach((l) => {
          text.push(l);
        });
      });
      // 2 entity with 2 rows => 4
      expect(rows.length).toBe(4);

      // 1st entity 2 row 3 cols 1 title
      // 2nd entity 2 row 2 cols 1 title
      // (2*3 + 1) + (2*2 +1) =>12
      expect(text.length).toBe(12);
      //
      expect(text[0].textContent).toBe('UnitTestAlias');

      expect(text[1].textContent).toBe('int');
      expect(text[2].textContent).toBe('PKID');
      expect(text[3].textContent).toBe('PK,UK');

      expect(text[4].textContent).toBe('str');
      expect(text[5].textContent).toBe('Name');
      expect(text[6].textContent).toBe('');

      expect(text[7].textContent).toBe('UnitTestEntity');

      expect(text[8].textContent).toBe('int');
      expect(text[9].textContent).toBe('ID');

      expect(text[10].textContent).toBe('GUID');
      expect(text[11].textContent).toBe('Ref');
    });
  });

  describe('attribute relation renders, integration tests', () => {
    beforeAll(() => {
      InitContainer();
    });

    beforeEach(() => {
      CleanContainer();
    });

    it('should create row for each attribute', () => {
      diagramStub.draw();
      expect(SVG_ROOT.html()).not.toBeNull();
      expect(SVG_ROOT.html()).not.toBe('');
    });

    // it('should create link for each attribute', () => {
    // });
  });
});
