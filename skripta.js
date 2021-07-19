let bitoviOkvir1  = document.getElementById("bitovi_okvir_1");
let poljeVrednost = document.getElementById("vrednost");
let poljeBajtovi  = document.getElementById("polje_bajtovi");

var MAPA        = [];
let NIZ_BAJTOVA = [];
let BITOVI_NIZ  = [];
let SPECIJALNI  = []

function inicijalizacijaMape() {
    return [
        0, 127, 2047, 65535, 2097151, 67108863
    ];
}

function inicijalizacijaNizaBitova() {
    return [
        0, 0, 0, 0, 0, 0, 0, 0
    ];
}

function brojanjeBajtova(n, mapa) {
    let i = 0;

    while(n > mapa[i]) {
        i++;
    }

    return i;
}

function popunjavanjeNiza(n, nizBajtova, nizSpecijalni) {
    let i = 0;
    while(i < n) {
        nizBajtova.push(0);
        nizSpecijalni.push(2);
        i++;
    }
}

function maskiranjeNiza(nizBajtova, nizSpecijalni) {
    let i = 1;
    let n = nizBajtova.length;

    if(n == 1) {
        nizSpecijalni[0] = 0;
        return;
    }
    
    nizSpecijalni[0] = n + 1; 
    nizBajtova[0]    = parseInt(254 << (8 - n - 1)) % 256;
    
    while(i < n) {
        nizBajtova[i] = 128;
        i++;
    }
}

function upisivanjeVrednosti(broj, nizBajtova) {
    let n = nizBajtova.length;
    
    if(n == 1) {
        nizBajtova[0] = broj;
        return;
    }

    n--;

    while(n >= 0) {
        let p  = parseInt(broj % 64);
        nizBajtova[n] = nizBajtova[n] | p;
        broj          = broj >> 6;
        n--;
    }
}

function encodeUTF8(n, mapa, nizBajtova, nizSpecijalni) {
    let brojBajtova  = brojanjeBajtova(n, mapa);
    nizBajtova       = [];
    nizSpecijalni    = [];
    popunjavanjeNiza(brojBajtova, nizBajtova, nizSpecijalni);
    maskiranjeNiza(nizBajtova, nizSpecijalni);
    upisivanjeVrednosti(n, nizBajtova);
    ispisBajtova(nizBajtova, bitoviOkvir1, nizSpecijalni);
}

function racunanjeStepena(n) {
    let s = 1;
    while(n > 1) {
        s *= 64;
        n--;
    }
    return s;
}

// Kada se pronađe 'legitiman' niz znakova koji tvore
// UNICODE znak po UTF-8 standardu

function decodeUTF8Paket(niz) {
    let n = niz.length;
    if(n == 1) return niz[0];

    let s = racunanjeStepena(n); // STEPEN
    let m = 255 >> (n + 1);      // MASKA
    let v = (niz[0] & m) * s;    // VREDNOST

    s    /= 64;
    m     = 255 >> 2;
    
    for(let i = 1; i < n; i++) {
        v += (niz[i] & m) * s;
        s /= 64;
    }

    return v;
}

function citanjeBitPozicije(p, n) { // n - pozicija; v - promenljiva
    p = p >> (n - 1);
    return p & 1;

}

function opipavanjeZnaka(z) {
    if(citanjeBitPozicije(z, 8) == 0) return 0; // ASCII

    if(citanjeBitPozicije(z, 7) == 0) return 1; // DOPUNSKI

    // AKO SMO DOSLI DO OVDE, ZNAK JE POCETNI UTF-8 ZNAK

    let d = 2; // broj bajtova

    if(citanjeBitPozicije(z, 6) == 1) d++; else return d;
    if(citanjeBitPozicije(z, 5) == 1) d++; else return d;
    if(citanjeBitPozicije(z, 4) == 1) d++; else return d;
    if(citanjeBitPozicije(z, 3) == 1) d++; else return d;
    if(citanjeBitPozicije(z, 2) == 1) d++; else return d;
}

function dekodiranjeZnakaTip0(znak, niz, paket, stanje) {
    if(!stanje.paketZapocet) {
        paket.push(parseInt(znak));
        niz.push(decodeUTF8Paket(paket));
        paket.length = 0;
    }
    else {
        throw "Samostalni ASCII znak ne može biti deo paketa UTF-8 znakova!";
    }
}

function dekodiranjeZnakaTip1(znak,niz, paket, stanje) {
    stanje.prebrojavanje--;
    if(stanje.paketZapocet) {
        if(stanje.prebrojavanje >= 0) {
            paket.push(znak);
            if(stanje.prebrojavanje == 0) {
                niz.push(decodeUTF8Paket(paket));
                stanje.paketZapocet = false;
                paket.length = 0;
            }
        }
        else {
            throw "Dopunski UTF-8 znak pojavio se samostalno posle paketa!";
        }
    }
    else {
            throw "Dopunski UTF-8 znak ne može biti prvi znak u paketu!";
    }
}

function dekodiranjeZnakaTip2(znak, niz, paket, stanje) {
    if(!stanje.paketZapocet) {
        stanje.prebrojavanje = stanje.tipZnaka - 1;
        stanje.paketZapocet  = true;
        paket.push(znak)
    }
    else {
        throw "Otvarajući UTF-8 znak pojavio se na mestu koje nije početak paketa!";
    }
}

function decodeUTF8(poruka) {
    let niz           = [];
    let paket         = [];
    
    let stanje = {
        paketZapocet:  false,
        prebrojavanje: 0,
        tipZnaka:      0
    }

    for(let i = 0; i < poruka.length; i++) {
        
        let znak = poruka[i];

        stanje.tipZnaka = opipavanjeZnaka(znak);

        try {
            if(stanje.tipZnaka == 0) {
                dekodiranjeZnakaTip0(znak, niz, paket, stanje);
                continue;
            }

            if(stanje.tipZnaka == 1) {
                dekodiranjeZnakaTip1(znak, niz, paket, stanje);
                continue;
            }

            if(stanje.tipZnaka > 1) {
                dekodiranjeZnakaTip2(znak, niz, paket, stanje);
            }
        }
        catch (greska) {
            return greska;
        }
    }
    
    if(paket.length > 0) return "Dekodiranje UTF-8 znaka je započeto, ali, nije završeno!";

    return niz;
}

function ispisBajtova(nizBajtova, polje, nizSpecijalni) {
    polje.innerHTML        = "";
    poljeBajtovi.innerHTML = "";
    for(let i = 0; i < nizBajtova.length; i++) {
        popunjavanjeBitova(nizBajtova[i], BITOVI_NIZ, nizSpecijalni, i);
        poljeBajtovi.innerHTML += nizBajtova[i] + " ";
    }
}

function generisanjeTabeleBitova(nizBitoviPom, polje, nizSpecijalni, ind) {
    let stepen = 128;

    for(let i = 0; i < nizBitoviPom.length; i++) {
        let bit = nizBitoviPom[i];
        let dodatni = (nizSpecijalni[ind] > 0 && i < nizSpecijalni[ind])? " bit_specijalni" : "";
        polje.innerHTML += `<div class='bit${dodatni}' title='${stepen}'>${bit}</div`;
        stepen = parseInt(stepen / 2);
    }
}

function popunjavanjeBitova(v, nizBitoviPom, nizSpecijalni, ind) {
    nizBitoviPom = inicijalizacijaNizaBitova();
    let i = 7;
    while(v > 0) {
        nizBitoviPom[i] = parseInt(v % 2);
        i--;
        v = parseInt(v / 2);
    }

    generisanjeTabeleBitova(nizBitoviPom, bitoviOkvir1, nizSpecijalni, ind);
}

function obrada() {
    MAPA = inicijalizacijaMape();
    let vrednost = poljeVrednost.value;
    encodeUTF8(vrednost, MAPA, NIZ_BAJTOVA, SPECIJALNI);
    document.getElementById("utf8_ispis").innerHTML = `&#${vrednost};`;
}

function obradaDekodiranje() {
	let v = document.getElementById("vrednost_dekodiranje").value.trim();
	let i = document.getElementById("utf8_ispis_dekodiranje");

		
	let niz = v.split(' ').filter(x => x != "");
	let p   = decodeUTF8(niz);
	
	if(typeof(p) === 'string') {
		i.innerHTML = p;
		return;
	}
	
	let s   = "";
	
	p.forEach(x => {
		s += `&#${x}; `;
	});
	i.innerHTML = s;
}

obrada();
obradaDekodiranje();
