import { type JourneyResponse, type Question, BaseValidator } from '@planning-inspectorate/dynamic-forms';
import { MANAGE_LIST_ACTIONS } from '@planning-inspectorate/dynamic-forms/src/components/manage-list/manage-list-actions.js';
import { body } from 'express-validator';

/**
 * Validator for validating a question's answer against another question's answer using a custom validation function.
 */
export class LinkedCasesLeadValidator extends BaseValidator {
	validationFunction: (listItems: unknown) => boolean;

	constructor({ validationFunction }: { validationFunction: (listItems: unknown) => boolean }) {
		super();
		if (typeof validationFunction !== 'function') {
			throw new Error('LinkedCasesLeadValidator requires a validationFunction');
		}
		this.validationFunction = validationFunction;
	}

	/**
	 * Validates response body against individual field validators.
	 */
	validate(questionObj: Question, journeyResponse: JourneyResponse) {
		return body().custom(async (_, { req }) => {
			// Allow removing items even if the list is otherwise "invalid"
			if (req.params?.manageListAction === MANAGE_LIST_ACTIONS.REMOVE) {
				return true;
			}

			const listItems = journeyResponse?.answers?.[questionObj.fieldName] || [];
			return this.validationFunction(listItems);
		});
	}
}
