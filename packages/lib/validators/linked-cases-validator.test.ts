import type { JourneyResponse, Question } from '@planning-inspectorate/dynamic-forms';
import { MANAGE_LIST_ACTIONS } from '@planning-inspectorate/dynamic-forms/src/components/manage-list/manage-list-actions.js';
import assert from 'assert';
import { describe, it } from 'node:test';
import { LinkedCasesLeadValidator } from './linked-cases-validator.ts';

/** Minimal Question stub */
function makeQuestion(overrides: Partial<Question> = {}): Question {
	return {
		fieldName: 'linkedCaseDetails',
		bodyFieldNames: ['linkedCaseDetails'],
		...overrides
	} as unknown as Question;
}

/** Minimal express-like request stub */
function makeReq(overrides: Record<string, unknown> = {}) {
	return {
		body: {},
		params: {},
		cookies: {},
		headers: {},
		...overrides
	};
}

/** Runs the returned validation chain against a fake req and returns errors */
async function runValidation(
	validator: LinkedCasesLeadValidator,
	question: Question,
	journeyResponse: JourneyResponse,
	req: ReturnType<typeof makeReq>
) {
	const chain = validator.validate(question, journeyResponse);
	return chain.run(req as never);
}

describe('LinkedCasesLeadValidator', () => {
	describe('constructor', () => {
		it('throws when validationFunction is missing', () => {
			assert.throws(() => new LinkedCasesLeadValidator({} as never), /validationFunction/);
		});

		it('throws when validationFunction is not a function', () => {
			assert.throws(() => new LinkedCasesLeadValidator({ validationFunction: 42 as never }), /validationFunction/);
		});

		it('assigns validationFunction on success', () => {
			const fn = () => true;
			const v = new LinkedCasesLeadValidator({ validationFunction: fn });
			assert.strictEqual(v.validationFunction, fn);
		});
	});

	describe('validate()', () => {
		it('passes when validationFunction returns true', async () => {
			const v = new LinkedCasesLeadValidator({ validationFunction: () => true });
			const result = await runValidation(
				v,
				makeQuestion(),
				{ answers: { linkedCaseDetails: [{ id: '1' }] } } as unknown as JourneyResponse,
				makeReq()
			);
			assert.strictEqual(result.isEmpty(), true);
		});

		it('fails when validationFunction returns false', async () => {
			const v = new LinkedCasesLeadValidator({
				validationFunction: () => {
					throw new Error('Some error');
				}
			});
			const result = await runValidation(
				v,
				makeQuestion(),
				{ answers: { linkedCaseDetails: [{ id: '1' }] } } as unknown as JourneyResponse,
				makeReq()
			);
			assert.strictEqual(result.isEmpty(), false);
		});

		it('surfaces the error message thrown by validationFunction', async () => {
			const v = new LinkedCasesLeadValidator({
				validationFunction: () => {
					throw new Error('Only 1 lead case can be added');
				}
			});
			const result = await runValidation(
				v,
				makeQuestion(),
				{
					answers: {
						linkedCaseDetails: [
							{ id: '1', linkedCaseIsLead: 'yes' },
							{ id: '2', linkedCaseIsLead: 'yes' }
						]
					}
				} as unknown as JourneyResponse,
				makeReq()
			);
			assert.strictEqual(result.isEmpty(), false);
			const [err] = result.array();
			assert.strictEqual(err.msg, 'Only 1 lead case can be added');
		});

		it('passes the list items to the validationFunction', async () => {
			let received: unknown;
			const v = new LinkedCasesLeadValidator({
				validationFunction: (listItems: unknown) => {
					received = listItems;
					return true;
				}
			});
			const listItems = [{ id: '1', linkedCaseIsLead: 'yes' }];
			await runValidation(
				v,
				makeQuestion(),
				{ answers: { linkedCaseDetails: listItems } } as unknown as JourneyResponse,
				makeReq()
			);
			assert.deepStrictEqual(received, listItems);
		});

		it('defaults to empty array when no answers exist', async () => {
			let received: unknown;
			const v = new LinkedCasesLeadValidator({
				validationFunction: (listItems: unknown) => {
					received = listItems;
					return true;
				}
			});
			await runValidation(v, makeQuestion(), {} as JourneyResponse, makeReq());
			assert.deepStrictEqual(received, []);
		});

		it('skips validation (passes) when the action is REMOVE', async () => {
			let called = false;
			const v = new LinkedCasesLeadValidator({
				validationFunction: () => {
					called = true;
					return false;
				}
			});
			const result = await runValidation(
				v,
				makeQuestion(),
				{ answers: { linkedCaseDetails: [{ id: '1' }] } } as unknown as JourneyResponse,
				makeReq({ params: { manageListAction: MANAGE_LIST_ACTIONS.REMOVE } })
			);
			assert.strictEqual(called, false);
			assert.strictEqual(result.isEmpty(), true);
		});
	});
});
