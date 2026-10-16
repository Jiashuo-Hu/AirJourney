# v0.4 Logo逐项显示复核

2026-10-15。115家完整SVG存档、92家独立图形；优先图形，无可靠图形则保留完整文字标志（用户最后明确，包括Finnair）。缺少整个可靠矢量资源才占位。用户自定义SVG和历史数据不删除。

独立图形以完整轮廓/独立原件处理，不用矩形裁剪切断图形，不拉伸、不嵌位图。公司名与固有字母图形区分：TAP、Virgin、KQ、JAL等图形自身的字母保留；Emirates仅阿拉伯书法图形。完整组合版上排有文字属于存档，下排才是默认显示。

重点二轮：修整Air Serbia、Air India、Eurowings、STARLUX、Oman、WestJet、Air Transat、Avianca、Allegiant、Jetstar等轮廓；补提LOT、Norwegian、HK Express、Peach、Tigerair Taiwan、Bangkok、Cebu、Gulf、Air Tahiti Nui、Air Niugini、Kenya。Kenya白图加海军蓝展示底；Tahiti白花使用原品牌青色底；Niugini去冗余全画布裁剪以解决SVG结构兼容。来源与原始文件仍保留。

逐页检查light/dark联系图，应用真实DOM校验器检查207变体；最终安装版逐家选取、保存并核对实际SVG。具体结果以test_report及evidence_index为准。不是对全部历史或当前全球品牌用法的权威认定。

| Code | Airline | Default |
|---|---|---|
| CA | Air China | Independent graphic |
| MU | China Eastern Airlines | Independent graphic |
| CZ | China Southern Airlines | Independent graphic |
| LH | Lufthansa | Independent graphic |
| SQ | Singapore Airlines | Independent graphic |
| AF | Air France | Independent graphic |
| EK | Emirates | Independent graphic |
| BA | British Airways | Independent graphic |
| UA | United Airlines | Independent graphic |
| QF | Qantas | Independent graphic |
| JL | Japan Airlines | Independent graphic |
| DL | Delta Air Lines | Independent graphic |
| TK | Turkish Airlines | Independent graphic |
| QR | Qatar Airways | Independent graphic |
| NH | All Nippon Airways | Independent graphic |
| KL | KLM | Independent graphic |
| CX | Cathay Pacific | Independent graphic |
| LX | Swiss International Air Lines | Independent graphic |
| AC | Air Canada | Independent graphic |
| AY | Finnair | Complete wordmark (no verified graphic) |
| NZ | Air New Zealand | Independent graphic |
| TG | Thai Airways | Independent graphic |
| BR | EVA Air | Independent graphic |
| HU | Hainan Airlines | Independent graphic |
| ZH | Shenzhen Airlines | Independent graphic |
| MF | Xiamen Airlines | Independent graphic |
| VN | Vietnam Airlines | Independent graphic |
| MH | Malaysia Airlines | Independent graphic |
| AK | AirAsia | Complete wordmark (no verified graphic) |
| TR | Scoot | Complete wordmark (no verified graphic) |
| EY | Etihad Airways | Complete wordmark (no verified graphic) |
| KE | Korean Air | Independent graphic |
| 6E | IndiGo | Independent graphic |
| AA | American Airlines | Independent graphic |
| WN | Southwest Airlines | Independent graphic |
| B6 | JetBlue Airways | Complete wordmark (no verified graphic) |
| GA | Garuda Indonesia | Independent graphic |
| PR | Philippine Airlines | Independent graphic |
| IB | Iberia | Independent graphic |
| VY | Vueling | Complete wordmark (no verified graphic) |
| U2 | easyJet | Complete wordmark (no verified graphic) |
| FR | Ryanair | Independent graphic |
| SK | Scandinavian Airlines | Complete wordmark (no verified graphic) |
| LO | LOT Polish Airlines | Independent graphic |
| TP | TAP Air Portugal | Independent graphic |
| OS | Austrian Airlines | Independent graphic |
| SN | Brussels Airlines | Independent graphic |
| EI | Aer Lingus | Independent graphic |
| UX | Air Europa | Independent graphic |
| AZ | ITA Airways | Complete wordmark (no verified graphic) |
| A3 | Aegean Airlines | Independent graphic |
| FI | Icelandair | Independent graphic |
| BT | airBaltic | Complete wordmark (no verified graphic) |
| W6 | Wizz Air | Complete wordmark (no verified graphic) |
| DY | Norwegian Air Shuttle | Independent graphic |
| EW | Eurowings | Independent graphic |
| DE | Condor | Independent graphic |
| JU | Air Serbia | Independent graphic |
| AI | Air India | Independent graphic |
| CI | China Airlines | Independent graphic |
| OZ | Asiana Airlines | Complete wordmark (no verified graphic) |
| JX | STARLUX Airlines | Independent graphic |
| UO | HK Express | Independent graphic |
| HX | Hong Kong Airlines | Independent graphic |
| HO | Juneyao Air | Independent graphic |
| MM | Peach Aviation | Independent graphic |
| IT | Tigerair Taiwan | Independent graphic |
| 7C | Jeju Air | Complete wordmark (no verified graphic) |
| LJ | Jin Air | Independent graphic |
| TW | Trinity Airways | Independent graphic |
| VJ | VietJet Air | Complete wordmark (no verified graphic) |
| PG | Bangkok Airways | Independent graphic |
| 5J | Cebu Pacific | Independent graphic |
| JT | Lion Air | Independent graphic |
| SV | Saudia | Independent graphic |
| WY | Oman Air | Independent graphic |
| GF | Gulf Air | Independent graphic |
| FZ | flydubai | Complete wordmark (no verified graphic) |
| G9 | Air Arabia | Complete wordmark (no verified graphic) |
| KC | Air Astana | Independent graphic |
| AS | Alaska Airlines | Complete wordmark (no verified graphic) |
| HA | Hawaiian Airlines | Independent graphic |
| WS | WestJet | Independent graphic |
| TS | Air Transat | Independent graphic |
| PD | Porter Airlines | Complete wordmark (no verified graphic) |
| LA | LATAM Airlines | Independent graphic |
| AV | Avianca | Independent graphic |
| CM | Copa Airlines | Independent graphic |
| AM | Aeroméxico | Independent graphic |
| G3 | GOL Linhas Aéreas | Complete wordmark (no verified graphic) |
| AD | Azul Brazilian Airlines | Independent graphic |
| AR | Aerolíneas Argentinas | Independent graphic |
| JA | JetSMART | Complete wordmark (no verified graphic) |
| F9 | Frontier Airlines | Complete wordmark (no verified graphic) |
| NK | Spirit Airlines | Complete wordmark (no verified graphic) |
| G4 | Allegiant Air | Independent graphic |
| SY | Sun Country Airlines | Independent graphic |
| MX | Breeze Airways | Independent graphic |
| VA | Virgin Australia | Independent graphic |
| JQ | Jetstar Airways | Independent graphic |
| FJ | Fiji Airways | Independent graphic |
| TN | Air Tahiti Nui | Independent graphic |
| SB | Aircalin | Independent graphic |
| PX | Air Niugini | Independent graphic |
| ET | Ethiopian Airlines | Independent graphic |
| KQ | Kenya Airways | Independent graphic |
| MS | Egyptair | Independent graphic |
| AT | Royal Air Maroc | Independent graphic |
| VS | Virgin Atlantic | Independent graphic |
| HV | Transavia | Independent graphic |
| PC | Pegasus Airlines | Complete wordmark (no verified graphic) |
| XQ | SunExpress | Independent graphic |
| QP | Akasa Air | Independent graphic |
| SA | South African Airways | Independent graphic |
| MK | Air Mauritius | Independent graphic |

Spring Airlines：找到的SVG内嵌位图，未纳入，保留缺失占位。每文件来源、变换和权利条件见public/logos/airlines/manifest.json与本目录asset_registry.csv。
