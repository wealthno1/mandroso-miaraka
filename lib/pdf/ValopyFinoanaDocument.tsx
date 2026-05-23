import {
  Document,
  ImageBackground,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer"

type ValopyFinoanaDocumentProps = {
  pages: Array<{
    topNumber: string
    bottomNumber: string
  }>
  templateData: Buffer
}

const A4_WIDTH = 595.28
const A4_HEIGHT = 841.89
const HALF_A4_HEIGHT = A4_HEIGHT / 2

/*
  Coordonnées mesurées sur le gabarit intégré :
  - cartouche supérieur : environ 67 pt × 27 pt
  - position : 23 pt du bord droit et 19 pt du bord haut
  - le cartouche inférieur reprend exactement la même position
    dans la seconde moitié de la page A4.
*/
const NUMBER_BOX_WIDTH = 67
const NUMBER_BOX_HEIGHT = 27
const NUMBER_BOX_RIGHT = 23
const NUMBER_BOX_TOP_FIRST_FLYER = 19

// Le cartouche du deuxième flyer est légèrement plus haut
// dans le gabarit PNG que la moitié géométrique exacte de l'A4.
const NUMBER_BOX_TOP_SECOND_FLYER =
  NUMBER_BOX_TOP_FIRST_FLYER + HALF_A4_HEIGHT - 4

const styles = StyleSheet.create({
  page: {
    width: A4_WIDTH,
    height: A4_HEIGHT,
    backgroundColor: "#FFFFFF",
  },

  template: {
    width: A4_WIDTH,
    height: A4_HEIGHT,
    position: "relative",
  },

  /*
    Cette zone remplace entièrement le cartouche original du PNG :
    elle masque à la fois l'ancien "N°", le trait et son cadre,
    puis recrée un cadre propre avec le numéro réel.
  */
  generatedNumberBox: {
    position: "absolute",
    width: NUMBER_BOX_WIDTH,
    height: NUMBER_BOX_HEIGHT,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#17395F",
    borderRadius: 3,
    alignItems: "center",
    justifyContent: "center",
  },

  topNumber: {
    top: NUMBER_BOX_TOP_FIRST_FLYER,
    right: NUMBER_BOX_RIGHT,
  },

  bottomNumber: {
    top: NUMBER_BOX_TOP_SECOND_FLYER,
    right: NUMBER_BOX_RIGHT,
  },

  numberText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9.5,
    color: "#17395F",
    letterSpacing: 0.15,
  },
})

export default function ValopyFinoanaDocument({
  pages,
  templateData,
}: ValopyFinoanaDocumentProps) {
  return (
    <Document
      title="Valopy Finoana - Flyers numérotés"
      author="KOFA - FJKM Ambodihady Vaovao"
      subject="Iray Volana ho an'ny Tompo - 21 Jona 2026"
      language="mg"
    >
      {pages.map(({ topNumber, bottomNumber }) => (
        <Page
          key={`${topNumber}-${bottomNumber}`}
          size="A4"
          style={styles.page}
          wrap={false}
        >
          <ImageBackground
            src={{ data: templateData, format: "png" }}
            style={styles.template}
          >
            <View style={[styles.generatedNumberBox, styles.topNumber]}>
              <Text style={styles.numberText}>N° {topNumber}</Text>
            </View>

            <View style={[styles.generatedNumberBox, styles.bottomNumber]}>
              <Text style={styles.numberText}>N° {bottomNumber}</Text>
            </View>
          </ImageBackground>
        </Page>
      ))}
    </Document>
  )
}