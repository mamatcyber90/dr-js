import nodeModuleAssert from 'assert'
import { ObjectAs, ArrayOf } from './index'

const { describe, it } = global

const schemaA = ObjectAs('SchemaA', { id: '', a: 0, b: {}, c: null })
const schemaB = ObjectAs('SchemaB', { ...schemaA.struct, d: [], e: '' })
const schemaC = ObjectAs('SchemaC', {
  stateA: schemaA,
  stateB: schemaB,
  stateBList: ArrayOf('SchemaBList', schemaB)
})

describe('Common.Module.StateSchema', () => {
  it('schema build check', () => {
    nodeModuleAssert.throws(
      () => ObjectAs('SchemaTEST', { stateA: schemaA, stateB: schemaA }),
      'should prevent same named schema as children'
    )

    nodeModuleAssert.throws(
      () => ObjectAs('SchemaTEST', { stateA: ObjectAs('SameName', { key: 'value' }), stateB: ArrayOf('SameName', 'string') }),
      'should prevent same named schema as children'
    )
  })

  it('reducer undefined should return initialState', () => {
    nodeModuleAssert.strictEqual(schemaA.reducer(undefined, {}), schemaA.initialState)
    nodeModuleAssert.strictEqual(schemaB.reducer(undefined, {}), schemaB.initialState)
    nodeModuleAssert.strictEqual(schemaC.reducer(undefined, {}), schemaC.initialState)
  })

  it('actMap simple', () => {
    const state = schemaC.reducer(undefined, { name: 'SchemaB', type: 'set', payload: { key: 'e', value: 'changedE' } })
    nodeModuleAssert.notStrictEqual(state, schemaC.initialState)
    nodeModuleAssert.notStrictEqual(state.stateB, schemaC.initialState.stateB)
    nodeModuleAssert.strictEqual(state.stateBList, schemaC.initialState.stateBList)
    nodeModuleAssert.strictEqual(state.stateB.e, 'changedE')
  })

  it('actMap extend', () => {
    const state0 = schemaC.reducer(undefined, { name: 'SchemaBList', type: 'push', payload: { value: { ...schemaB.initialState, id: 0 } } })
    nodeModuleAssert.notStrictEqual(state0, schemaC.initialState)
    nodeModuleAssert.strictEqual(state0.stateB, schemaC.initialState.stateB)
    nodeModuleAssert.notStrictEqual(state0.stateBList, schemaC.initialState.stateBList)

    const state1 = schemaC.reducer(state0, { name: 'SchemaBList', type: 'push', payload: { value: { ...schemaB.initialState, id: 1 } } })
    const state2 = schemaC.reducer(state1, { name: 'SchemaA', type: 'set', payload: { key: 'id', value: 'set value' } })
    nodeModuleAssert.notStrictEqual(state2, schemaC.initialState)
    nodeModuleAssert.strictEqual(state2.stateB, schemaC.initialState.stateB)
    nodeModuleAssert.notStrictEqual(state2.stateBList, schemaC.initialState.stateBList)
    nodeModuleAssert.strictEqual(state2.stateBList.length, 2)

    const state3 = schemaC.reducer(state2, {
      name: 'SchemaBList', index: 0, payload: { name: 'SchemaB', type: 'set', payload: { key: 'e', value: 'changedE0' } }
    })
    nodeModuleAssert.strictEqual(state3.stateBList[ 0 ].e, 'changedE0')

    const state3b = schemaC.reducer(state2, {
      name: 'SchemaBList',
      batch: [
        { name: 'SchemaBList', index: 0, payload: { name: 'SchemaB', type: 'set', payload: { key: 'e', value: 'changedE0' } } },
        { name: 'SchemaBList', filter: { type: 'key-value', key: 'id', value: 1 }, payload: { name: 'SchemaB', type: 'set', payload: { key: 'e', value: 'changedE1' } } }
      ]
    })
    const state3c = schemaC.reducer(undefined, {
      name: 'SchemaC',
      batch: [
        { name: 'SchemaA', type: 'set', payload: { key: 'id', value: 'set value' } },
        { name: 'SchemaBList', type: 'push', payload: { value: { ...schemaB.initialState, id: 0 } } },
        { name: 'SchemaBList', type: 'push', payload: { value: { ...schemaB.initialState, id: 1 } } },
        { name: 'SchemaA', type: 'set', payload: { key: 'id', value: 'set value' } },
        {
          name: 'SchemaBList',
          batch: [
            { name: 'SchemaBList', index: 0, payload: { name: 'SchemaB', type: 'set', payload: { key: 'e', value: 'changedE0' } } },
            { name: 'SchemaBList', filter: { type: 'key-value', key: 'id', value: 1 }, payload: { name: 'SchemaB', type: 'set', payload: { key: 'e', value: 'changedE1' } } }
          ]
        }
      ]
    })
    nodeModuleAssert.deepEqual(state3b, state3c)
    nodeModuleAssert.deepEqual(state3c, {
      stateA: { id: 'set value', a: 0, b: {}, c: null },
      stateB: { id: '', a: 0, b: {}, c: null, d: [], e: '' },
      stateBList: [
        { id: 0, a: 0, b: {}, c: null, d: [], e: 'changedE0' },
        { id: 1, a: 0, b: {}, c: null, d: [], e: 'changedE1' }
      ]
    })

    const state4 = schemaC.reducer(state3, {
      name: 'SchemaBList', filter: { type: 'key-value', key: 'id', value: 1 }, payload: { name: 'SchemaB', type: 'set', payload: { key: 'e', value: 'changedE1' } }
    })
    nodeModuleAssert.strictEqual(state4.stateBList[ 0 ].e, 'changedE0')
    nodeModuleAssert.strictEqual(state4.stateBList[ 1 ].e, 'changedE1')
  })
})
