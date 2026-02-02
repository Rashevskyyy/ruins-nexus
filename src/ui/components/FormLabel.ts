/**
 * FormLabel - Label component for form fields
 */

import * as PIXI from 'pixi.js';
import { TEXT_STYLES } from '../styles/fonts';

export class FormLabel extends PIXI.Text {
    constructor(text: string) {
        super({
            text: text.toUpperCase(),
            style: TEXT_STYLES.label,
        });
    }
}
