/**
 * Block Validators Registry
 *
 * AUTO-GENERATED from Convex validator files.
 * Run: bun tools/generate-blocks.ts
 */
import { v } from 'convex/values';
import { addressValidator } from './blocks/address';
import { calloutValidator } from './blocks/callout';
import { checkboxValidator } from './blocks/checkbox';
import { dataGridValidator } from './blocks/data_grid';
import { datePickerValidator } from './blocks/date_picker';
import { dividerValidator } from './blocks/divider';
import { emailValidator } from './blocks/email';
import { fileUploadValidator } from './blocks/file_upload';
import { formulaValidator } from './blocks/formula';
import { imageUploadValidator } from './blocks/image_upload';
import { longTextValidator } from './blocks/long_text';
import { radioGroupValidator } from './blocks/radio_group';
import { ratingValidator } from './blocks/rating';
import { sectionHeaderValidator } from './blocks/section_header';
import { selectValidator } from './blocks/select';
import { signatureValidator } from './blocks/signature';
import { smartNumberValidator } from './blocks/smart_number';
import { smartTextValidator } from './blocks/smart_text';

export const blockValidator = v.union(
	addressValidator,
	fileUploadValidator,
	formulaValidator,
	imageUploadValidator,
	ratingValidator,
	signatureValidator,
	datePickerValidator,
	emailValidator,
	longTextValidator,
	smartNumberValidator,
	smartTextValidator,
	checkboxValidator,
	radioGroupValidator,
	selectValidator,
	calloutValidator,
	dataGridValidator,
	dividerValidator,
	sectionHeaderValidator
);

export const blocksArrayValidator = v.array(blockValidator);
