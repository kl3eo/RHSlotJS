import { SYMBOLS_RANDOM } from '../../constants/symbols.constants';
import { HAS_TOUCH } from '../../constants/browser.constants';
import { SlotMachine } from '../slot-machine/slot-machine.component';
import { ToggleButton } from '../toggle-button/toggle-button.component';
import { Modal } from '../modal/modal.component';
import { PayTable } from '../pay-table/pay-table.component';
import { SMSoundService } from '../../services/slot-machine/sound/slot-machine-sound.service';
import { SMVibrationService } from '../../services/slot-machine/vibration/slot-machine-vibration.service';

import './app.style.scss';
import '../header/header.styles.scss';
import '../footer/footer.styles.scss';
import '../modal/modal.styles.scss';
import '../pay-table/pay-table.styles.scss';
import '../instructions/instructions.styles.scss';
import '../spbinder/spbinder.styles.scss';

const SERVICES = {
    sound: SMSoundService,
    vibration: SMVibrationService,
};

const handleOptionChange = (key, value) => {
    const service = SERVICES[key];

    if (service) service[value ? 'enable' : 'disable']();

    localStorage.setItem(key, value);
};

export class App {

    // CSS classes:
    static C_FOCUS_ACTIVE = 'focus-active';

    // CSS selectors:
    static S_COINS = '#coins';
    static S_JACKPOT = '#jackpot';
    static S_SPINS = '#spins';
    static S_MAIN = '#main';
    static S_TOGGLE_SOUND = '#toggleSound';
    static S_TOGGLE_VIBRATION = '#toggleVibration';
    static S_VIBRATION_INSTRUCTIONS = '#vibrationInstructions';
    static S_SP_BINDER_MODAL = '#spbinderModal';
    static S_SP_BINDER_MODAL_BUTTON = '#toggleSpbinder';
    static S_INSTRUCTIONS_MODAL = '#instructionsModal';
    static S_INSTRUCTIONS_MODAL_BUTTON = '#toggleInstructions';
    static S_PAY_TABLE_MODAL = '#payTableModal';
    static S_PAY_TABLE_MODAL_BUTTON = '#togglePayTable';
    static S_PLAY = '#playButton';

    // Misc.:
    static ONE_DAY = 1000 * 60 * 60 * 24;

    // Elements:
    coinsElement = document.querySelector(App.S_COINS);
    jackpotElement = document.querySelector(App.S_JACKPOT);
    spinsElement = document.querySelector(App.S_SPINS);
    mainElement = document.querySelector(App.S_MAIN);

    // Components:
    slotMachine;
    payTable;
    instructionsModal;
    spbinderModal;

    // State:
    // TODO: Create constants in a config file for all these numbers...
    coins = parseInt(localStorage.coins, 10) || 3;
    jackpot = parseInt(localStorage.jackpot, 10) || 1000;
    spins = parseInt(localStorage.spins, 10) || 0;
    lastSpin = localStorage.lastSpin || 0;
    isSoundDisabled = localStorage.sound === 'false';
    isVibrationDisabled = localStorage.vibration === 'false';
    isFirstTime = localStorage.firstTime !== 'false';

    constructor() {
        const now = Date.now();

        // Update jackpot randomly:
        if (now - this.lastSpin >= App.ONE_DAY) {
            localStorage.jackpot = this.jackpot = Math.max(500, this.jackpot - 500 + (Math.random() * 1000)) | 0;
            localStorage.lastSpin = now;
        }

        // Bind event listeners:
        this.handleModalToggle = this.handleModalToggle.bind(this);
        this.handleUseCoin = this.handleUseCoin.bind(this);
        this.handleGetPrice = this.handleGetPrice.bind(this);

        let focusActive = false;
	
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab' && !focusActive) {
                focusActive = true;
                document.body.classList.add(App.C_FOCUS_ACTIVE);
            } else if (e.key === 'Escape' && focusActive) {
                focusActive = false;
                document.body.classList.remove(App.C_FOCUS_ACTIVE);
            }
        });

        document.addEventListener('mousedown', () => {
            focusActive = false;
            document.body.classList.remove(App.C_FOCUS_ACTIVE);
        });

        // Init/render conditional parts of the UI such as vibration and first-time only features:
        this.initUI();

    }

    handleUseCoin() {
        if (this.spins === 2) this.endGame().then(() => {console.log('ended game'); return}).catch((err) => console.log('Err:', err));
	
	localStorage.coins = this.coins = Math.max(this.coins - 1, 0);
        localStorage.jackpot = ++this.jackpot;
        localStorage.spins = ++this.spins;
        localStorage.lastSpin = this.lastSpin = Date.now();

        this.refreshGameInfo();
    }

    async setCoo () {
      const urlee = this.makeUrlee('action_vg_sj')
      fetch(urlee).then((response) => response.json()).then((result) => {
        console.log('set session', result);
      }).catch(function (err) { console.log('Error', err) })
    }
    
    makeUrlee (s) {
      const inFrame = window !== window.top
      const h = inFrame ? 'https://slotjs.room-house.com' : this.getParentOrigin()
      const reh = /https:\/\//gi
      const hh = h.replace(reh, '')
      const poh = hh.split(':')
      const hhh = hh.split('.')
      const checkerPort = (hhh[0] === 'aspen' || hhh[0] === 'cube' || hhh[0] === 'slotjs') ? '' : ':8453'
      const genc = (hhh[0] === 'dussel' || hhh[0] === 'slotjs') ? '' : '/genc'
      const u = 'https://' + poh[0] + checkerPort + '/cgi' + genc + '/' + s
//console.log('here urlee is', u);
      return u
    }

    getParentOrigin () {
      let a = this.alpha; //paranoid flags
      const locationAreDistinct = (window.location !== window.parent.location)
      const parentOrigin = ((locationAreDistinct ? document.referrer : document.location) || '').toString()
      if (parentOrigin) {
        return new URL(parentOrigin).origin
      }
      const currentLocation = document.location
      if (currentLocation.ancestorOrigins && currentLocation.ancestorOrigins.length) {
        return currentLocation.ancestorOrigins[0]
      }
      return ''
    }

    async endGame() {
	this.slotMachine.boundAccount = false;
//console.log('endGame: set bound to', this.slotMachine.boundAccount);
	this.setCoo().then(() => {console.log('reset cookie'); localStorage.coins = this.coins = 3; localStorage.spins = this.spins = 0;});
    }

    handleGetPrice(jackpotPercentage) {
        const price = Math.min(Math.max(Math.ceil(jackpotPercentage * this.jackpot), 10), this.jackpot);

        //localStorage.jackpot = this.jackpot = Math.max(this.jackpot - price, 0) || 1000;
        //localStorage.coins = this.coins += price;
	fetch('https://' + window.location.hostname + '/cgi/checker_sj.pl?mode=get_claim&claim='+jackpotPercentage, {credentials: 'include'}).then(respo => respo.text()).then((respo) => {
		console.log('claimed', jackpotPercentage, 'result', respo);
		this.refreshGameInfo();
	}).catch(err => console.log(err));
    }

    refreshGameInfo() {
        const maxValue = Math.max(this.coins, this.jackpot, this.spins);
        const padding = Math.max(Math.ceil(maxValue.toString().length / 2) * 2, 5);

        this.coinsElement.innerText = `${ this.coins }`.padStart(padding, '0');
        this.jackpotElement.innerText = `${ this.jackpot }`.padStart(padding, '0');
        this.spinsElement.innerText = `${ this.spins }`.padStart(padding, '0');
    }

    initUI() {
        const { isFirstTime } = this;

        // Init/render the game info at the top:
        this.refreshGameInfo();

        if (!HAS_TOUCH) {
            // TODO: Move to toggle button?
            document.querySelector(App.S_TOGGLE_VIBRATION).parentElement.setAttribute('hidden', true);
            // TODO: Move to instructions modal?
            document.querySelector(App.S_VIBRATION_INSTRUCTIONS).setAttribute('hidden', true);
        }

        this.initToggleButtons();

        const playButtonElement = document.querySelector(App.S_PLAY);

        if (isFirstTime) {
            
            playButtonElement.onclick = () => {
                this.isFirstTime = localStorage.firstTime = false;

                playButtonElement.setAttribute('hidden', true);

                this.instructionsModal.close();
		this.spbinderModal.close();

                document.activeElement.blur();

                // this.slotMachine.start();
		this.setCoo();
		
            };
        } else {
            playButtonElement.setAttribute('hidden', true);
        }

        this.spbinderModal = new Modal(
            App.S_SP_BINDER_MODAL,
            App.S_SP_BINDER_MODAL_BUTTON,
            'spbinder',
            false,
            false,
            this.handleModalToggle,
        );
	
        // TODO: Pass params as options, except for root selector or some of the basic ones...:

        // Init/render instructions modal, which might be open straight away:
        this.instructionsModal = new Modal(
            App.S_INSTRUCTIONS_MODAL,
            App.S_INSTRUCTIONS_MODAL_BUTTON,
            'instructions',
            isFirstTime,
            isFirstTime,
            this.handleModalToggle,
        );

        // Init/render slot machine symbols:
        this.slotMachine = new SlotMachine(
            this.mainElement,
            this.handleUseCoin,
            this.handleGetPrice,
            5,
            SYMBOLS_RANDOM,
            isFirstTime,
        );

        // Init/render pay table and pay table modal, which is always closed in the beginning:
        this.payTable = new PayTable(SYMBOLS_RANDOM);

        // TODO: Should be disabled in the begining (or hide button):
        // TODO: Hide modals with hidden rather than is-open...
        // eslint-disable-next-line no-new
        new Modal(
            App.S_PAY_TABLE_MODAL,
            App.S_PAY_TABLE_MODAL_BUTTON,
            'pay-table',
            false,
            false,
            this.handleModalToggle,
        );
    }

    initToggleButtons() {
        // eslint-disable-next-line no-new
        new ToggleButton(App.S_TOGGLE_SOUND, 'sound', !this.isSoundDisabled, handleOptionChange);

        if (HAS_TOUCH) {
            // eslint-disable-next-line no-new
            new ToggleButton(App.S_TOGGLE_VIBRATION, 'vibration', !this.isVibrationDisabled, handleOptionChange);
        }
    }

    handleModalToggle(isOpen, key) {
        if (!this.slotMachine || key.includes('-init')) return;

        if (isOpen) {
            this.slotMachine.pause();
        } else {
            this.slotMachine.resume();
        }
    }

}
