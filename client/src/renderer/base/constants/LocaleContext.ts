import { createContext } from 'react';
import { localization } from '../../../common/localization';


export const LocaleContext = createContext<localization>(null)